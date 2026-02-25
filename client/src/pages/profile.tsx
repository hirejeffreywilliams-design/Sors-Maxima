import { useState } from "react";
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
} from "lucide-react";
import type { GeneratedTicket, TicketLeg } from "@/lib/ticket-orchestrator";

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

  const tierName = subscription?.tier || tierInfo?.tier || "Free";
  const tierColors: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    elite: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    whale: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="space-y-6">
      <Card>
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
                <p className="font-medium">{authData?.isAdmin ? "Administrator" : "User"}</p>
                {authData?.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subscription</Label>
              <Badge className={tierColors[tierName.toLowerCase()] || tierColors.free}>
                {tierName}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Membership</Label>
              <p className="font-medium text-sm" data-testid="text-profile-access">
                {tierInfo?.access || "Unrestricted member access"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
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

      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>Export your data or manage your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data including betting history,
              settings, community posts, and referral data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">Type <strong>DELETE</strong> to confirm:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete My Account"}
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
    queryKey: ['/api/user/betting-profile'],
  });

  const [profile, setProfile] = useState<BettingProfileData | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[] | null>(null);
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[] | null>(null);

  const currentProfile = profile ?? savedProfile ?? defaultProfile;
  const currentTeams = favoriteTeams ?? savedProfile?.favoriteTeams ?? [];
  const currentLeagues = favoriteLeagues ?? savedProfile?.favoriteLeagues ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: BettingProfileData) => {
      const res = await apiRequest("POST", "/api/user/betting-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/betting-profile'] });
      toast({ title: "Profile saved!", description: "Your betting preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile. Please try again.", variant: "destructive" });
    },
  });

  const toggleBetType = (bt: string) => {
    const prev = profile ?? savedProfile ?? defaultProfile;
    setProfile({
      ...prev,
      preferredBetTypes: prev.preferredBetTypes.includes(bt)
        ? prev.preferredBetTypes.filter(t => t !== bt)
        : [...prev.preferredBetTypes, bt],
    });
  };

  const toggleTeam = (team: string) => {
    const prev = favoriteTeams ?? savedProfile?.favoriteTeams ?? [];
    setFavoriteTeams(
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const toggleLeague = (league: string) => {
    const prev = favoriteLeagues ?? savedProfile?.favoriteLeagues ?? [];
    setFavoriteLeagues(
      prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]
    );
  };

  const saveProfile = () => {
    saveMutation.mutate({
      ...currentProfile,
      favoriteTeams: currentTeams,
      favoriteLeagues: currentLeagues,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="betting-profile-loading">
        <Card><CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  const profileType = getProfileType(currentProfile);

  return (
    <div className="space-y-6" data-testid="betting-profile-page">
      <Card data-testid="card-betting-quiz">
        <CardContent className="p-5 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Betting Style Quiz
          </h2>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q1">Q1: What is your risk tolerance?</p>
              <div className="flex flex-wrap gap-2">
                {(["conservative", "moderate", "aggressive"] as RiskTolerance[]).map(option => (
                  <Button
                    key={option}
                    variant={currentProfile.riskTolerance === option ? "default" : "outline"}
                    size="sm"
                    className={`capitalize toggle-elevate ${currentProfile.riskTolerance === option ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), riskTolerance: option }))}
                    data-testid={`button-risk-${option}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q2">Q2: Preferred bet types (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {betTypeOptions.map(bt => (
                  <Button
                    key={bt}
                    variant={currentProfile.preferredBetTypes.includes(bt) ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.preferredBetTypes.includes(bt) ? "toggle-elevated" : ""}`}
                    onClick={() => toggleBetType(bt)}
                    data-testid={`button-bettype-${bt.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {bt}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q3">Q3: Bankroll strategy</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "flat" as BankrollStrategy, label: "Flat betting" },
                  { value: "percentage" as BankrollStrategy, label: "Percentage" },
                  { value: "kelly" as BankrollStrategy, label: "Kelly Criterion" },
                ]).map(option => (
                  <Button
                    key={option.value}
                    variant={currentProfile.bankrollStrategy === option.value ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.bankrollStrategy === option.value ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), bankrollStrategy: option.value }))}
                    data-testid={`button-bankroll-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q4">Q4: Bet frequency</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "1-2" as BetFrequency, label: "1-2 per day" },
                  { value: "3-5" as BetFrequency, label: "3-5 per day" },
                  { value: "5+" as BetFrequency, label: "5+ per day" },
                ]).map(option => (
                  <Button
                    key={option.value}
                    variant={currentProfile.betFrequency === option.value ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.betFrequency === option.value ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), betFrequency: option.value }))}
                    data-testid={`button-frequency-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid="profile-result">
            <div className="flex items-center gap-2">
              {profileType.icon}
              <span className="text-lg font-bold" data-testid="text-profile-type">{profileType.name}</span>
            </div>
            <ul className="space-y-1.5">
              {profileType.tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-tip-${i}`}>
                  <Star className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  {tip}
                </li>
              ))}
            </ul>
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
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">My Account</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account, betting style, and track your performance
          </p>
        </header>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md" data-testid="profile-tabs">
            <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm" data-testid="tab-profile">
              <User className="w-4 h-4 shrink-0" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="betting-dna" className="gap-1 text-xs sm:text-sm" data-testid="tab-betting-dna">
              <Target className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Betting</span> DNA
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
