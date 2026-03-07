import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import {
  User,
  Shield,
  Download,
  Trash2,
  Key,
  Monitor,
  Clock,
  AlertTriangle,
  Loader2,
  LogOut,
  Heart,
  Star,
  Trophy,
  Target,
  Zap,
  Settings,
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Minus,
  Flame,
  Wallet,
  Activity,
  Award,
  Sparkles,
  DollarSign,
  Calendar,
  BookOpen,
  Lock,
  ExternalLink,
  Crown,
} from "lucide-react";
import type { GeneratedTicket, TicketLeg } from "@/lib/ticket-orchestrator";
import { Link } from "wouter";
import { getCookieConsent, grantCookieConsent } from "@/components/cookie-consent";

type RiskTolerance = "conservative" | "moderate" | "aggressive";
type BankrollStrategy = "flat" | "percentage" | "kelly";
type BetFrequency = "1-2" | "3-5" | "5+";

interface BettingProfileData {
  riskTolerance: RiskTolerance;
  preferredBetTypes: string[];
  bankrollStrategy: BankrollStrategy;
  betFrequency: BetFrequency;
  favoriteTeams: string[];
  favoriteLeagues: string[];
}

export interface SavedTicket {
  id: number;
  ticket_id: string;
  name: string;
  sport: string;
  legs: TicketLeg[];
  total_odds: number;
  american_odds: number;
  recommended_stake: number;
  potential_payout: number;
  grade: string;
  saved_at: string;
  status: "pending" | "won" | "lost" | "push";
  settled_at?: string;
  actual_pl?: number;
}

const TICKET_HISTORY_KEY = ["/api/user/ticket-history"];

export async function saveTicketToHistory(ticket: GeneratedTicket): Promise<void> {
  await apiRequest("POST", "/api/user/ticket-history", {
    ticketId: ticket.id + "_" + Date.now(),
    name: ticket.name,
    sport: ticket.sport,
    legs: ticket.legs,
    totalOdds: ticket.totalOdds,
    americanOdds: ticket.americanOdds,
    recommendedStake: ticket.recommendedStake,
    potentialPayout: ticket.potentialPayout,
    grade: ticket.grade,
  });
  queryClient.invalidateQueries({ queryKey: TICKET_HISTORY_KEY });
}

const defaultProfile: BettingProfileData = {
  riskTolerance: "moderate",
  preferredBetTypes: [],
  bankrollStrategy: "flat",
  betFrequency: "1-2",
  favoriteTeams: [],
  favoriteLeagues: [],
};

const betTypeOptions = ["Moneylines", "Spreads", "Props", "Totals", "Mix of everything"];

const teamsByLeague: Record<string, string[]> = {
  NBA: ["Lakers", "Celtics", "Warriors", "Bucks", "76ers", "Nuggets", "Heat", "Suns", "Knicks", "Mavericks"],
  NFL: ["Chiefs", "49ers", "Eagles", "Cowboys", "Bills", "Ravens", "Dolphins", "Lions", "Bengals", "Jets"],
  MLB: ["Yankees", "Dodgers", "Astros", "Braves", "Mets", "Phillies", "Padres", "Rangers", "Orioles", "Twins"],
  NHL: ["Bruins", "Avalanche", "Panthers", "Rangers", "Oilers", "Stars", "Hurricanes", "Devils", "Maple Leafs", "Golden Knights"],
  NCAAB: ["Duke", "UNC", "Kansas", "Kentucky", "Gonzaga", "UConn", "Houston", "Purdue", "Alabama", "Tennessee"],
};

const leagueOptions = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
  { id: "NCAAB", label: "NCAAB" },
  { id: "NCAAF", label: "NCAAF" },
  { id: "Soccer_EPL", label: "EPL" },
  { id: "Soccer_LALIGA", label: "La Liga" },
  { id: "Soccer_BUNDESLIGA", label: "Bundesliga" },
  { id: "Soccer_SERIEA", label: "Serie A" },
  { id: "Soccer_LIGUE1", label: "Ligue 1" },
  { id: "Soccer_MLS", label: "MLS" },
  { id: "Soccer_UCL", label: "Champions League" },
];

function getProfileType(profile: BettingProfileData): { name: string; icon: JSX.Element; tips: string[] } {
  if (profile.betFrequency === "5+") {
    return {
      name: "The Grinder",
      icon: <Zap className="w-5 h-5" />,
      tips: [
        "Track every bet meticulously to spot patterns",
        "Set strict daily loss limits to protect your bankroll",
        "Focus on high-volume, lower-risk plays for consistency",
        "Take breaks to avoid fatigue-driven decisions",
      ],
    };
  }
  if (profile.riskTolerance === "aggressive") {
    return {
      name: "The High Roller",
      icon: <Trophy className="w-5 h-5" />,
      tips: [
        "Always have a hedge plan for your biggest bets",
        "Never risk more than 10% of your bankroll on a single play",
        "Look for correlated parlays to maximize upside",
        "Use alt lines strategically for better value",
      ],
    };
  }
  if (profile.riskTolerance === "conservative") {
    return {
      name: "The Sniper",
      icon: <Target className="w-5 h-5" />,
      tips: [
        "Wait for the best lines before placing bets",
        "Stick to 1-3 leg parlays for the highest hit rate",
        "Focus on moneylines and spreads for reliable edges",
        "Bankroll preservation is your greatest weapon",
      ],
    };
  }
  return {
    name: "The Balanced Bettor",
    icon: <Shield className="w-5 h-5" />,
    tips: [
      "Mix straight bets with occasional parlays",
      "Use the Kelly Criterion or percentage betting for optimal sizing",
      "Diversify across sports and bet types",
      "Review your results weekly and adjust strategy",
    ],
  };
}

function formatOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type AuraConfig = {
  label: string;
  sublabel: string;
  glowColor: string;
  gradientStyle: string;
  ringColor: string;
  textColor: string;
  bgPulse: string;
  borderColor: string;
  statsBg: string;
};

function getPerformanceAura(winRate: number, roi: number, hasData: boolean): AuraConfig {
  if (!hasData) {
    return {
      label: "Getting Started",
      sublabel: "Start tracking tickets to unlock your performance aura",
      glowColor: "rgba(99,102,241,0.18)",
      gradientStyle: "radial-gradient(ellipse 120% 50% at 50% -5%, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.12) 40%, transparent 70%)",
      ringColor: "#6366f1",
      textColor: "text-indigo-400",
      bgPulse: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      statsBg: "bg-indigo-500/5",
    };
  }
  if (winRate >= 55 || roi >= 5) {
    return {
      label: "Sharp Edge",
      sublabel: "You're beating the market — keep it up",
      glowColor: "rgba(34,197,94,0.2)",
      gradientStyle: "radial-gradient(ellipse 120% 50% at 50% -5%, rgba(34,197,94,0.28) 0%, rgba(16,185,129,0.15) 40%, transparent 70%)",
      ringColor: "#22c55e",
      textColor: "text-green-400",
      bgPulse: "bg-green-500/10",
      borderColor: "border-green-500/25",
      statsBg: "bg-green-500/5",
    };
  }
  if (winRate >= 45) {
    return {
      label: "Building Edge",
      sublabel: "Solid foundation — stay disciplined and grow",
      glowColor: "rgba(234,179,8,0.18)",
      gradientStyle: "radial-gradient(ellipse 120% 50% at 50% -5%, rgba(234,179,8,0.25) 0%, rgba(245,158,11,0.14) 40%, transparent 70%)",
      ringColor: "#eab308",
      textColor: "text-yellow-400",
      bgPulse: "bg-yellow-500/10",
      borderColor: "border-yellow-500/25",
      statsBg: "bg-yellow-500/5",
    };
  }
  return {
    label: "Needs Adjustment",
    sublabel: "Review your strategy and lean on the Sors engine",
    glowColor: "rgba(239,68,68,0.18)",
    gradientStyle: "radial-gradient(ellipse 120% 50% at 50% -5%, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.14) 40%, transparent 70%)",
    ringColor: "#ef4444",
    textColor: "text-red-400",
    bgPulse: "bg-red-500/10",
    borderColor: "border-red-500/25",
    statsBg: "bg-red-500/5",
  };
}

const TIER_DISPLAY: Record<string, { label: string; icon: JSX.Element; badge: string; crown: boolean }> = {
  free: {
    label: "Free",
    icon: <User className="w-3.5 h-3.5" />,
    badge: "bg-gray-500/15 text-gray-400 border-gray-500/25",
    crown: false,
  },
  pro: {
    label: "Sharp",
    icon: <Zap className="w-3.5 h-3.5" />,
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    crown: false,
  },
  elite: {
    label: "Edge",
    icon: <Flame className="w-3.5 h-3.5" />,
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    crown: false,
  },
  whale: {
    label: "Max",
    icon: <Crown className="w-3.5 h-3.5" />,
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    crown: true,
  },
};

function PerformanceRing({ winRate, ringColor, hasData }: { winRate: number; ringColor: string; hasData: boolean }) {
  const size = 88;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = hasData ? Math.min(100, Math.max(0, winRate)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} data-testid="performance-ring">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out", filter: `drop-shadow(0 0 6px ${ringColor}80)` }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <p className="text-lg font-bold leading-none" style={{ color: ringColor }} data-testid="text-winrate-ring">
          {hasData ? `${winRate.toFixed(0)}%` : "—"}
        </p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">Win Rate</p>
      </div>
    </div>
  );
}

function ProfileHero() {
  const { data: authData } = useQuery<{ authenticated: boolean; username?: string; isAdmin?: boolean; tier?: string }>({
    queryKey: ["/api/auth/check"],
  });
  const { data: tickets = [] } = useQuery<SavedTicket[]>({ queryKey: TICKET_HISTORY_KEY });
  const { data: streak } = useQuery<any>({ queryKey: ["/api/user/streak"] });
  const { data: bankroll } = useQuery<any>({ queryKey: ["/api/settings/bankroll"] });
  const { data: bettingProfile } = useQuery<any>({ queryKey: ["/api/user/betting-profile"] });
  const { data: subscription } = useQuery<any>({ queryKey: ["/api/subscription"] });

  const settled = tickets.filter((t) => t.status !== "pending");
  const wins = settled.filter((t) => t.status === "won").length;
  const losses = settled.filter((t) => t.status === "lost").length;
  const winRate = settled.length > 0 ? (wins / (wins + losses)) * 100 : 0;
  const totalStaked = settled.reduce((s, t) => s + t.recommended_stake, 0);
  const totalPL = settled.reduce((s, t) => s + (t.actual_pl ?? 0), 0);
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
  const hasData = settled.length >= 3;

  const aura = getPerformanceAura(winRate, roi, hasData);
  const tierKey = (subscription?.tier || authData?.tier || "free").toLowerCase();
  const tierConfig = TIER_DISPLAY[tierKey] || TIER_DISPLAY.free;

  const profile: BettingProfileData = bettingProfile ?? defaultProfile;
  const archetypeInfo = getProfileType(profile);

  const initials = (authData?.username || "?")
    .split(/[\s_-]/)
    .map((w: string) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentStreak = streak?.currentStreak ?? 0;
  const streakType = streak?.streakType ?? "none";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: aura.ringColor + "30" }}
      data-testid="profile-hero"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: aura.gradientStyle }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(ellipse 60% 60% at 50% 100%, ${aura.glowColor}, transparent)`,
        }}
      />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold bg-background/60 backdrop-blur-sm border-2"
              style={{ borderColor: aura.ringColor + "50", boxShadow: `0 0 24px ${aura.glowColor}, 0 0 48px ${aura.glowColor}` }}
              data-testid="avatar-initials"
            >
              {initials}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background"
              style={{ backgroundColor: aura.ringColor }}
            >
              {archetypeInfo.icon && (
                <span className="text-[10px] text-white">{archetypeInfo.icon}</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold truncate" data-testid="text-hero-username">
                {authData?.username || "Member"}
              </h2>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs flex items-center gap-1 px-2 py-0.5 ${tierConfig.badge}`}
                  data-testid="badge-tier"
                >
                  {tierConfig.icon}
                  {tierConfig.label}
                </Badge>
                {authData?.isAdmin && (
                  <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/25">
                    Admin
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className={`w-3.5 h-3.5 ${aura.textColor}`} />
              <span className={`text-sm font-medium ${aura.textColor}`} data-testid="text-archetype">
                {archetypeInfo.name}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className={`text-xs ${aura.textColor} opacity-80`}>{aura.label}</span>
            </div>

            <p className="text-xs text-muted-foreground italic">{aura.sublabel}</p>
          </div>

          <div className="shrink-0">
            <PerformanceRing winRate={winRate} ringColor={aura.ringColor} hasData={hasData} />
          </div>
        </div>

        <div className={`mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3`}>
          <div className={`rounded-xl p-3 text-center ${aura.statsBg} border ${aura.borderColor}`} data-testid="stat-hero-tickets">
            <p className="text-lg font-bold">{tickets.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tickets</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${aura.statsBg} border ${aura.borderColor}`} data-testid="stat-hero-record">
            <p className="text-lg font-bold">{wins}W–{losses}L</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Record</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${aura.statsBg} border ${aura.borderColor}`} data-testid="stat-hero-roi">
            <p className={`text-lg font-bold ${!hasData ? "" : roi >= 0 ? "text-green-400" : "text-red-400"}`}>
              {hasData ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ROI</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${aura.statsBg} border ${aura.borderColor}`} data-testid="stat-hero-streak">
            <div className="flex items-center justify-center gap-1">
              {streakType === "win" && <Flame className="w-4 h-4 text-orange-400" />}
              {streakType === "loss" && <TrendingDown className="w-4 h-4 text-red-400" />}
              <p className={`text-lg font-bold ${streakType === "win" ? "text-orange-400" : streakType === "loss" ? "text-red-400" : ""}`}>
                {currentStreak > 0 ? `${currentStreak}` : "—"}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {streakType === "win" ? "Win Streak" : streakType === "loss" ? "Loss Streak" : "Streak"}
            </p>
          </div>
        </div>

        {bankroll?.bankroll > 0 && (
          <div className={`mt-3 rounded-xl p-3 flex items-center justify-between ${aura.statsBg} border ${aura.borderColor}`} data-testid="stat-hero-bankroll">
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 ${aura.textColor}`} />
              <span className="text-sm text-muted-foreground">Active Bankroll</span>
            </div>
            <span className="font-bold text-sm" data-testid="text-bankroll-amount">
              ${bankroll.bankroll.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SavedTicket["status"] }) {
  const config = {
    pending: { label: "Pending", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
    won: { label: "Won", className: "bg-green-500/15 text-green-500 border-green-500/30" },
    lost: { label: "Lost", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    push: { label: "Push", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`} data-testid={`badge-status-${status}`}>
      {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
      {status === "won" && <Check className="w-3 h-3 mr-1" />}
      {status === "lost" && <X className="w-3 h-3 mr-1" />}
      {status === "push" && <Minus className="w-3 h-3 mr-1" />}
      {c.label}
    </Badge>
  );
}

function SummaryStats({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets.filter((t) => t.status !== "pending");
  const wins = tickets.filter((t) => t.status === "won").length;
  const losses = tickets.filter((t) => t.status === "lost").length;
  const pushes = tickets.filter((t) => t.status === "push").length;
  const winRate = settled.length > 0 ? (wins / (wins + losses)) * 100 : 0;
  const totalStaked = settled.reduce((sum, t) => sum + t.recommended_stake, 0);
  const totalPL = settled.reduce((sum, t) => sum + (t.actual_pl ?? 0), 0);
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;

  const stats = [
    { label: "Total Tickets", value: tickets.length.toString(), icon: History, testId: "stat-total" },
    { label: "Won / Lost / Push", value: `${wins} / ${losses} / ${pushes}`, icon: Trophy, testId: "stat-record" },
    { label: "Win Rate", value: settled.length > 0 ? `${winRate.toFixed(1)}%` : "\u2014", icon: TrendingUp, testId: "stat-winrate" },
    { label: "ROI", value: settled.length > 0 ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "\u2014", icon: BarChart3, testId: "stat-roi", color: roi >= 0 ? "text-green-500" : "text-red-400" },
    { label: "Profit / Loss", value: settled.length > 0 ? `${totalPL >= 0 ? "+" : ""}$${totalPL.toFixed(2)}` : "\u2014", icon: totalPL >= 0 ? TrendingUp : TrendingDown, testId: "stat-pl", color: totalPL >= 0 ? "text-green-500" : "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="summary-stats">
      {stats.map((s) => (
        <Card key={s.testId}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-4 h-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color ?? ""}`} data-testid={s.testId}>
              {s.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PerformanceChart({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets
    .filter((t) => t.status !== "pending" && t.actual_pl !== undefined && t.actual_pl !== null)
    .slice(0, 20)
    .reverse();

  if (settled.length === 0) return null;

  const maxAbs = Math.max(...settled.map((t) => Math.abs(t.actual_pl ?? 0)), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          P/L History (Last 20)
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-end gap-1 h-40" data-testid="performance-chart">
          {settled.map((t, i) => {
            const pl = t.actual_pl ?? 0;
            const pct = (Math.abs(pl) / maxAbs) * 100;
            const isPositive = pl >= 0;
            return (
              <div
                key={t.id}
                className="flex-1 flex flex-col justify-end items-center h-full relative"
                data-testid={`chart-bar-${i}`}
              >
                {isPositive ? (
                  <div className="w-full flex flex-col justify-end h-1/2">
                    <div
                      className="w-full bg-green-500 rounded-t-sm min-h-[2px]"
                      style={{ height: `${pct}%` }}
                      title={`$${pl.toFixed(2)}`}
                    />
                  </div>
                ) : (
                  <>
                    <div className="w-full h-1/2" />
                    <div
                      className="w-full bg-red-400 rounded-b-sm min-h-[2px]"
                      style={{ height: `${pct}%` }}
                      title={`-$${Math.abs(pl).toFixed(2)}`}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Profit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Loss
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ROIBySport({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets.filter((t) => t.status !== "pending");
  if (settled.length === 0) return null;

  const sportMap = new Map<string, { wins: number; losses: number; pushes: number; staked: number; pl: number }>();
  settled.forEach((t) => {
    const entry = sportMap.get(t.sport) ?? { wins: 0, losses: 0, pushes: 0, staked: 0, pl: 0 };
    if (t.status === "won") entry.wins++;
    if (t.status === "lost") entry.losses++;
    if (t.status === "push") entry.pushes++;
    entry.staked += t.recommended_stake;
    entry.pl += t.actual_pl ?? 0;
    sportMap.set(t.sport, entry);
  });

  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1].pl - a[1].pl);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          ROI by Sport
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3" data-testid="roi-by-sport">
          {sports.map(([sport, data]) => {
            const winRate = data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0;
            const roi = data.staked > 0 ? (data.pl / data.staked) * 100 : 0;
            return (
              <div key={sport} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg" data-testid={`sport-roi-${sport}`}>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sport}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.wins}W &ndash; {data.losses}L &ndash; {data.pushes}P
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-sm font-bold">{winRate.toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className={`text-sm font-bold ${roi >= 0 ? "text-green-500" : "text-red-400"}`}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketRow({ ticket, onSettle, onDelete, isSettling, isDeleting }: {
  ticket: SavedTicket;
  onSettle: (id: number, status: "won" | "lost" | "push") => void;
  onDelete: (id: number) => void;
  isSettling: boolean;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const pl = ticket.status === "won"
    ? ticket.potential_payout - ticket.recommended_stake
    : ticket.status === "lost"
    ? -ticket.recommended_stake
    : 0;

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`ticket-row-${ticket.id}`}
      >
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-date-${ticket.id}`}>
          {formatDate(ticket.saved_at)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate" data-testid={`text-name-${ticket.id}`}>{ticket.name}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{ticket.sport}</Badge>
          </div>
        </TableCell>
        <TableCell className="text-center text-sm" data-testid={`text-legs-${ticket.id}`}>{Array.isArray(ticket.legs) ? ticket.legs.length : 0}</TableCell>
        <TableCell className="text-sm font-medium whitespace-nowrap" data-testid={`text-odds-${ticket.id}`}>{formatOdds(ticket.american_odds)}</TableCell>
        <TableCell className="text-sm whitespace-nowrap" data-testid={`text-stake-${ticket.id}`}>${ticket.recommended_stake.toFixed(0)}</TableCell>
        <TableCell><StatusBadge status={ticket.status} /></TableCell>
        <TableCell className="text-sm whitespace-nowrap" data-testid={`text-payout-${ticket.id}`}>${ticket.potential_payout.toFixed(0)}</TableCell>
        <TableCell className={`text-sm font-bold whitespace-nowrap ${ticket.status === "pending" ? "text-muted-foreground" : pl >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-pl-${ticket.id}`}>
          {ticket.status === "pending" ? "\u2014" : `${pl >= 0 ? "+" : ""}$${pl.toFixed(2)}`}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {ticket.status === "pending" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "won")}
                  disabled={isSettling}
                  data-testid={`button-mark-won-${ticket.id}`}
                  title="Mark as Won"
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "lost")}
                  disabled={isSettling}
                  data-testid={`button-mark-lost-${ticket.id}`}
                  title="Mark as Lost"
                >
                  <X className="w-4 h-4 text-red-400" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "push")}
                  disabled={isSettling}
                  data-testid={`button-mark-push-${ticket.id}`}
                  title="Mark as Push"
                >
                  <Minus className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(ticket.id)}
              disabled={isDeleting}
              data-testid={`button-delete-${ticket.id}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow data-testid={`ticket-legs-${ticket.id}`}>
          <TableCell colSpan={9} className="bg-muted/20 p-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leg Details</p>
              {(Array.isArray(ticket.legs) ? ticket.legs : []).map((leg) => (
                <div key={leg.id} className="flex items-center justify-between gap-3 p-2.5 bg-muted/30 rounded-lg" data-testid={`leg-detail-${leg.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{leg.outcome}</p>
                    <p className="text-xs text-muted-foreground">{leg.team} vs {leg.opponent}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{leg.market}</Badge>
                  </div>
                  <span className="font-bold text-sm shrink-0">{formatOdds(leg.americanOdds)}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ProfileTab() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [cookieConsent, setCookieConsent] = useState(() => getCookieConsent());

  const { data: authData } = useQuery<{ authenticated: boolean; isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscription"],
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: tierInfo } = useQuery<any>({
    queryKey: ["/api/credits"],
  });

  const { data: achievements = [] } = useQuery<any[]>({
    queryKey: ["/api/user/achievements"],
  });

  const exportMutation = useMutation({
    mutationFn: () => fetch("/api/account/export", { credentials: "include" }).then((r) => r.json()),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sors-maxima-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data Exported", description: "Your data has been downloaded as a JSON file." });
    },
    onError: () => {
      toast({ title: "Export Failed", description: "Could not export your data. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/account"),
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Your account and data have been permanently removed." });
      window.location.href = "/";
    },
    onError: () => {
      toast({ title: "Deletion Failed", description: "Could not delete account. Please try again.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/account/change-password", data),
    onSuccess: () => {
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
    },
    onError: () => {
      toast({ title: "Password Change Failed", description: "Please check your current password and try again.", variant: "destructive" });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiRequest("POST", `/api/sessions/${sessionId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session Revoked", description: "The session has been terminated." });
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") return;
    deleteMutation.mutate();
  };

  const handleChangePassword = () => {
    if (!passwordCurrent || !passwordNew || passwordNew !== passwordConfirm) return;
    if (passwordNew.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: passwordCurrent, newPassword: passwordNew });
  };

  const tierKey = (subscription?.tier || "free").toLowerCase();
  const tierConfig = TIER_DISPLAY[tierKey] || TIER_DISPLAY.free;

  const unlockedAchievements = Array.isArray(achievements) ? achievements.filter((a: any) => a.unlocked) : [];

  return (
    <div className="space-y-6">
      <Card data-testid="card-account-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <p className="font-medium" data-testid="text-profile-username">{authData?.username || "Unknown"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="flex items-center gap-2">
                <p className="font-medium">{authData?.isAdmin ? "Administrator" : "Member"}</p>
                {authData?.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Membership Tier</Label>
              <Badge variant="outline" className={`flex items-center gap-1 w-fit ${tierConfig.badge}`} data-testid="badge-subscription-tier">
                {tierConfig.icon}
                {tierConfig.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Quick Links</Label>
              <div className="flex flex-wrap gap-2">
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7" data-testid="link-upgrade-plan">
                    <Crown className="w-3 h-3" />
                    Plans
                  </Button>
                </Link>
                <Link href="/bankroll">
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7" data-testid="link-bankroll">
                    <Wallet className="w-3 h-3" />
                    Bankroll
                  </Button>
                </Link>
                <Link href="/sorsbooks">
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7" data-testid="link-sorsbooks">
                    <BookOpen className="w-3 h-3" />
                    My Books
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {unlockedAchievements.length > 0 && (
        <Card data-testid="card-achievements">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-4 h-4 text-amber-400" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unlockedAchievements.slice(0, 8).map((a: any) => (
                <Badge
                  key={a.id}
                  variant="outline"
                  className="bg-amber-500/10 text-amber-400 border-amber-500/25 text-xs"
                  data-testid={`badge-achievement-${a.id}`}
                >
                  {a.icon && <span className="mr-1">{a.icon}</span>}
                  {a.name || a.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-change-password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordCurrent}
              onChange={(e) => setPasswordCurrent(e.target.value)}
              data-testid="input-password-current"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordNew}
                onChange={(e) => setPasswordNew(e.target.value)}
                data-testid="input-password-new"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                data-testid="input-password-confirm"
              />
            </div>
          </div>
          {passwordNew && passwordConfirm && passwordNew !== passwordConfirm && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={!passwordCurrent || !passwordNew || passwordNew !== passwordConfirm || changePasswordMutation.isPending}
            className="gap-2"
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-sessions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your login sessions across devices</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Session tracking data will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                  data-testid={`session-${session.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{session.device || "Unknown Device"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.lastActive || "Unknown"}
                        {session.current && (
                          <Badge variant="secondary" className="text-[10px] ml-1">Current</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      className="gap-1"
                      data-testid={`button-revoke-session-${session.id}`}
                    >
                      <LogOut className="w-3 h-3" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-privacy">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>Export your data or manage your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Cookie Preferences</p>
              <p className="text-xs text-muted-foreground">
                By using Sors Maxima, you agree to our use of cookies for session management and experience personalization.{" "}
                <Link href="/legal" className="text-primary underline">View Privacy Policy</Link>
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cookieConsent?.accepted ? "bg-green-500/10 text-green-400 border-green-500/25 text-xs" : "bg-muted text-muted-foreground text-xs"}
                  data-testid="badge-cookie-status"
                >
                  {cookieConsent?.accepted ? <><Check className="w-3 h-3 mr-1" />Accepted</> : "Not set"}
                </Badge>
                {!cookieConsent?.accepted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => { grantCookieConsent(); setCookieConsent({ accepted: true }); }}
                    data-testid="button-accept-cookies"
                  >
                    Accept All Cookies
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border">
            <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Export My Data</p>
              <p className="text-xs text-muted-foreground">
                Download all your personal data including betting history, settings, and preferences as a JSON file.
                This is part of our GDPR/CCPA compliance.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="gap-2"
                data-testid="button-export-data"
              >
                {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download My Data
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all betting history, and associated data.
              This action cannot be undone. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            data-testid="input-delete-confirm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-delete-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BettingDNATab() {
  const { toast } = useToast();
  const { data: savedProfile, isLoading } = useQuery<BettingProfileData>({
    queryKey: ["/api/user/betting-profile"],
  });

  const [localProfile, setLocalProfile] = useState<BettingProfileData>(defaultProfile);

  const currentProfile = savedProfile ?? localProfile;
  const [currentTeams, setCurrentTeams] = useState<string[]>(currentProfile.favoriteTeams);
  const [currentLeagues, setCurrentLeagues] = useState<string[]>(currentProfile.favoriteLeagues);

  const saveMutation = useMutation({
    mutationFn: (data: BettingProfileData) => apiRequest("POST", "/api/user/betting-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/betting-profile"] });
      toast({ title: "Profile Saved", description: "Your betting DNA has been updated." });
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save your profile. Please try again.", variant: "destructive" });
    },
  });

  const profile = savedProfile ?? localProfile;
  const archetypeInfo = getProfileType(profile);

  const updateProfile = (updates: Partial<BettingProfileData>) => {
    setLocalProfile((prev) => ({ ...prev, ...updates }));
  };

  const toggleTeam = (key: string) => {
    setCurrentTeams((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const toggleLeague = (id: string) => {
    setCurrentLeagues((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const saveProfile = () => {
    saveMutation.mutate({
      ...profile,
      favoriteTeams: currentTeams,
      favoriteLeagues: currentLeagues,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-archetype">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              {archetypeInfo.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Bettor Archetype</p>
              <p className="text-lg font-bold" data-testid="text-archetype-name">{archetypeInfo.name}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {archetypeInfo.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-archetype-tip-${i}`}>
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="card-betting-preferences">
        <CardContent className="p-5 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Betting Preferences
          </h2>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Risk Tolerance</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["conservative", "moderate", "aggressive"] as RiskTolerance[]).map((r) => (
                <Button
                  key={r}
                  variant={profile.riskTolerance === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateProfile({ riskTolerance: r })}
                  className="capitalize toggle-elevate"
                  data-testid={`button-risk-${r}`}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Preferred Bet Types</Label>
            <div className="flex flex-wrap gap-2">
              {betTypeOptions.map((bt) => {
                const selected = profile.preferredBetTypes.includes(bt);
                return (
                  <Badge
                    key={bt}
                    variant={selected ? "default" : "outline"}
                    className={`cursor-pointer gap-1 toggle-elevate ${selected ? "toggle-elevated" : ""}`}
                    onClick={() => {
                      const updated = selected
                        ? profile.preferredBetTypes.filter((t) => t !== bt)
                        : [...profile.preferredBetTypes, bt];
                      updateProfile({ preferredBetTypes: updated });
                    }}
                    data-testid={`badge-bettype-${bt.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    {bt}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Bankroll Strategy</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["flat", "percentage", "kelly"] as BankrollStrategy[]).map((s) => (
                <Button
                  key={s}
                  variant={profile.bankrollStrategy === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateProfile({ bankrollStrategy: s })}
                  className="capitalize toggle-elevate"
                  data-testid={`button-strategy-${s}`}
                >
                  {s === "kelly" ? "Kelly" : s}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Daily Bet Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["1-2", "3-5", "5+"] as BetFrequency[]).map((f) => (
                <Button
                  key={f}
                  variant={profile.betFrequency === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateProfile({ betFrequency: f })}
                  className="toggle-elevate"
                  data-testid={`button-frequency-${f}`}
                >
                  {f} bets
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={saveProfile} className="w-full gap-2" disabled={saveMutation.isPending} data-testid="button-save-profile">
            <Shield className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-favorite-teams">
        <CardContent className="p-5 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorite Teams
          </h2>
          <p className="text-sm text-muted-foreground">Select your favorite teams to prioritize them in ticket generation</p>

          {Object.entries(teamsByLeague).map(([league, teams]) => (
            <div key={league} className="space-y-2">
              <h3 className="text-sm font-semibold" data-testid={`text-league-header-${league}`}>{league}</h3>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => {
                  const key = `${league}-${team}`;
                  const selected = currentTeams.includes(key);
                  return (
                    <Badge
                      key={key}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer gap-1 toggle-elevate ${selected ? "toggle-elevated" : ""}`}
                      onClick={() => toggleTeam(key)}
                      data-testid={`badge-team-${key}`}
                    >
                      {selected && <Star className="w-3 h-3" />}
                      {team}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="card-favorite-leagues">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Favorite Leagues
          </h2>
          <p className="text-sm text-muted-foreground">Selected leagues will auto-populate the sport selector on the generator page</p>

          <div className="flex flex-wrap gap-2">
            {leagueOptions.map(league => {
              const selected = currentLeagues.includes(league.id);
              return (
                <Button
                  key={league.id}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className={`toggle-elevate ${selected ? "toggle-elevated" : ""}`}
                  onClick={() => toggleLeague(league.id)}
                  data-testid={`button-league-${league.id}`}
                >
                  {selected && <Star className="w-3.5 h-3.5 mr-1" />}
                  {league.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BetHistoryTab() {
  const { data: tickets = [], isLoading } = useQuery<SavedTicket[]>({
    queryKey: TICKET_HISTORY_KEY,
  });

  const settleMutation = useMutation({
    mutationFn: async ({ id, status, actualPL }: { id: number; status: string; actualPL: number }) => {
      await apiRequest("PATCH", `/api/user/ticket-history/${id}`, { status, actualPL });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_HISTORY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user/ticket-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_HISTORY_KEY });
    },
  });

  const handleSettle = (id: number, status: "won" | "lost" | "push") => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    let actualPL = 0;
    if (status === "won") actualPL = ticket.potential_payout - ticket.recommended_stake;
    if (status === "lost") actualPL = -ticket.recommended_stake;
    settleMutation.mutate({ id, status, actualPL });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="ticket-history-loading">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex flex-col gap-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-6" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-12" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const sorted = [...tickets].sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());

  return (
    <div className="space-y-6" data-testid="ticket-history-page">
      <div className="flex items-center gap-3 flex-wrap">
        <History className="w-5 h-5 text-primary" />
        <span className="text-lg font-semibold">Ticket History</span>
        <Badge variant="outline" className="text-xs">{tickets.length} saved</Badge>
      </div>

      <SummaryStats tickets={tickets} />

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <History className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-title">No Tickets Saved Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Generate tickets using the Smart Generator and save them here to track your performance over time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceChart tickets={sorted} />
            </div>
            <div>
              <ROIBySport tickets={tickets} />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                All Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-xs">Date</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Ticket</TableHead>
                      <TableHead className="text-center whitespace-nowrap text-xs">Legs</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Odds</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Stake</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Status</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Payout</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">P/L</TableHead>
                      <TableHead className="w-32 whitespace-nowrap text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onSettle={handleSettle}
                        onDelete={handleDelete}
                        isSettling={settleMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ProfilePage() {
  useSEO({ title: "Profile", description: "Manage your account, betting profile, and bet history" });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ProfileHero />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md" data-testid="profile-tabs">
            <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm" data-testid="tab-profile">
              <User className="w-4 h-4 shrink-0" />
              Account
            </TabsTrigger>
            <TabsTrigger value="betting-dna" className="gap-1 text-xs sm:text-sm" data-testid="tab-betting-dna">
              <Target className="w-4 h-4 shrink-0" />
              Betting DNA
            </TabsTrigger>
            <TabsTrigger value="bet-history" className="gap-1 text-xs sm:text-sm" data-testid="tab-bet-history">
              <History className="w-4 h-4 shrink-0" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="betting-dna" className="mt-6">
            <BettingDNATab />
          </TabsContent>

          <TabsContent value="bet-history" className="mt-6">
            <BetHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
