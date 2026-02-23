import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Trophy,
  Crown,
  Medal,
  Lock,
  Copy,
  CheckCircle2,
  Star,
  Shield,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SavedTicket } from "@/pages/ticket-history";

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

function computeUserStats(tickets: SavedTicket[]) {
  const settled = tickets.filter((t) => t.status !== "pending");
  const wins = tickets.filter((t) => t.status === "won").length;
  const losses = tickets.filter((t) => t.status === "lost").length;
  const totalStaked = settled.reduce((sum, t) => sum + t.recommendedStake, 0);
  const totalPL = settled.reduce((sum, t) => sum + (t.actualPL ?? 0), 0);
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  let longestStreak = 0;
  let currentStreak = 0;
  const sorted = [...tickets].sort(
    (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime(),
  );
  for (const t of sorted) {
    if (t.status === "won") {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (t.status === "lost") {
      currentStreak = 0;
    }
  }

  return { roi, winRate, totalProfit: totalPL, longestStreak, wins, losses };
}

const MOCK_COMPETITORS = [
  { name: "SharpShooter42", roi: 34.2, winRate: 67.5, totalProfit: 4820, longestStreak: 11 },
  { name: "VegasKing", roi: 28.7, winRate: 62.1, totalProfit: 3650, longestStreak: 9 },
  { name: "ParlayPete", roi: 22.1, winRate: 58.9, totalProfit: 2940, longestStreak: 8 },
  { name: "EdgeHunter", roi: 18.5, winRate: 55.3, totalProfit: 2100, longestStreak: 7 },
  { name: "MoneyMoves", roi: 14.3, winRate: 53.8, totalProfit: 1580, longestStreak: 6 },
  { name: "StatMaster", roi: 10.8, winRate: 51.2, totalProfit: 920, longestStreak: 5 },
  { name: "BetWizard", roi: 7.2, winRate: 49.5, totalProfit: 540, longestStreak: 5 },
  { name: "OddsOracle", roi: 3.1, winRate: 47.8, totalProfit: 210, longestStreak: 4 },
  { name: "RookieBets", roi: -2.4, winRate: 44.1, totalProfit: -180, longestStreak: 3 },
];

type RankCriteria = "roi" | "winRate" | "totalProfit" | "longestStreak";

function getRankBadge(rank: number) {
  if (rank === 1)
    return (
      <Badge className="bg-yellow-500 text-yellow-950 gap-1 text-xs" data-testid="badge-gold">
        <Crown className="w-3 h-3" />
        Gold
      </Badge>
    );
  if (rank === 2)
    return (
      <Badge className="bg-gray-300 text-gray-800 gap-1 text-xs" data-testid="badge-silver">
        <Medal className="w-3 h-3" />
        Silver
      </Badge>
    );
  if (rank === 3)
    return (
      <Badge className="bg-amber-700 text-amber-100 gap-1 text-xs" data-testid="badge-bronze">
        <Medal className="w-3 h-3" />
        Bronze
      </Badge>
    );
  return null;
}

function formatStatValue(criteria: RankCriteria, value: number) {
  switch (criteria) {
    case "roi":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "winRate":
      return `${value.toFixed(1)}%`;
    case "totalProfit":
      return `${value >= 0 ? "+" : ""}$${value.toFixed(0)}`;
    case "longestStreak":
      return `${value} W`;
  }
}

function ShareTab() {
  const [ticketId, setTicketId] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharedTicket, setSharedTicket] = useState<SavedTicket | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedId = params.get("id");
    if (encodedId) {
      try {
        const decoded = atob(encodedId);
        const ticket = JSON.parse(decoded) as SavedTicket;
        setSharedTicket(ticket);
      } catch {
        // ignore
      }
    }
  }, [location]);

  const handleGenerateLink = () => {
    const tickets = loadTickets();
    const found = tickets.find((t) => t.id === ticketId || t.id.includes(ticketId));
    if (!found) {
      toast({ title: "Not Found", description: "No ticket found with that ID.", variant: "destructive" });
      return;
    }
    const encoded = btoa(JSON.stringify(found));
    const link = `${window.location.origin}/shared-tickets?id=${encoded}`;
    setShareLink(link);
    setSharedTicket(found);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "Copied", description: "Share link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTicket = sharedTicket;
  const shortId = displayTicket ? displayTicket.id.slice(0, 8) : "";

  return (
    <div className="space-y-6" data-testid="share-tab">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Generate Share Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter ticket ID..."
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              data-testid="input-ticket-id"
            />
            <Button onClick={handleGenerateLink} data-testid="button-generate-link">
              <Share2 className="w-4 h-4 mr-1.5" />
              Generate Share Link
            </Button>
          </div>
          {shareLink && (
            <div className="flex items-center gap-2">
              <Input readOnly value={shareLink} className="text-xs" data-testid="input-share-link" />
              <Button size="icon" variant="outline" onClick={handleCopy} data-testid="button-copy-link">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {displayTicket && (
        <Card data-testid="shared-ticket-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1 min-w-0">
                <h3 className="font-semibold text-lg" data-testid="text-shared-ticket-name">
                  {displayTicket.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{displayTicket.sport}</Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      displayTicket.grade.startsWith("A")
                        ? "border-green-500 text-green-500"
                        : displayTicket.grade.startsWith("B")
                          ? "border-blue-500 text-blue-500"
                          : displayTicket.grade.startsWith("C")
                            ? "border-yellow-500 text-yellow-500"
                            : "border-red-400 text-red-400"
                    }`}
                    data-testid="badge-shared-grade"
                  >
                    Grade: {displayTicket.grade}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Odds</p>
                <p className="text-lg font-bold" data-testid="text-shared-odds">
                  {formatOdds(displayTicket.americanOdds)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Legs ({displayTicket.legs.length})
              </p>
              {displayTicket.legs.map((leg) => (
                <div
                  key={leg.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-muted/30 rounded-lg"
                  data-testid={`shared-leg-${leg.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{leg.outcome}</p>
                    <p className="text-xs text-muted-foreground">
                      {leg.team} vs {leg.opponent}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {leg.market}
                    </Badge>
                  </div>
                  <span className="font-bold text-sm shrink-0">{formatOdds(leg.americanOdds)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground italic" data-testid="text-watermark">
                Generated by Sors Maxima | Ticket #{shortId}
              </p>
              <p className="text-[10px] text-muted-foreground/60" data-testid="text-watermark-id">
                WM-{shortId}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [criteria, setCriteria] = useState<RankCriteria>("roi");
  const userStats = useMemo(() => computeUserStats(loadTickets()), []);

  const allEntries = useMemo(() => {
    const userEntry = {
      name: "You",
      roi: userStats.roi,
      winRate: userStats.winRate,
      totalProfit: userStats.totalProfit,
      longestStreak: userStats.longestStreak,
      isUser: true,
    };
    const entries = [
      ...MOCK_COMPETITORS.map((c) => ({ ...c, isUser: false })),
      userEntry,
    ];
    entries.sort((a, b) => {
      const aVal = a[criteria];
      const bVal = b[criteria];
      return (bVal as number) - (aVal as number);
    });
    return entries;
  }, [criteria, userStats]);

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
          <Button
            key={opt.value}
            size="sm"
            variant={criteria === opt.value ? "default" : "outline"}
            onClick={() => setCriteria(opt.value)}
            data-testid={`button-criteria-${opt.value}`}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {allEntries.map((entry, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={entry.name}
                  className={`flex items-center gap-3 p-3 ${entry.isUser ? "bg-primary/5" : ""}`}
                  data-testid={`leaderboard-entry-${rank}`}
                >
                  <span
                    className="w-8 text-center font-bold text-sm text-muted-foreground"
                    data-testid={`text-rank-${rank}`}
                  >
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm truncate ${entry.isUser ? "text-primary" : ""}`}
                      data-testid={`text-username-${rank}`}
                    >
                      {entry.name}
                      {entry.isUser && (
                        <Star className="w-3 h-3 inline ml-1 text-primary" />
                      )}
                    </p>
                  </div>
                  <span
                    className={`font-bold text-sm ${
                      (entry[criteria] as number) >= 0 ? "text-green-500" : "text-red-400"
                    }`}
                    data-testid={`text-stat-${rank}`}
                  >
                    {formatStatValue(criteria, entry[criteria] as number)}
                  </span>
                  <div className="w-20 flex justify-end">{getRankBadge(rank)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TierAccessTab() {
  const dailyUsage = useMemo(() => getDailyUsage(), []);

  const tiers = [
    {
      name: "Sharp",
      price: "$49",
      period: "/mo",
      current: true,
      icon: <Shield className="w-5 h-5 text-blue-500" />,
      features: [
        "25 tickets per day",
        "Full 46-factor engine",
        "+EV finder & bet grading",
        "ROI dashboard",
      ],
      limitations: [
        "No AI assistant",
        "No prop projections",
        "No arbitrage scanner",
      ],
    },
    {
      name: "Edge",
      price: "$99",
      period: "/mo",
      current: false,
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      features: [
        "Unlimited tickets",
        "AI Betting Assistant",
        "Prop projections",
        "Line movement alerts",
        "SGP optimizer",
      ],
      limitations: [],
    },
    {
      name: "Max",
      price: "$249",
      period: "/mo",
      current: false,
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      features: [
        "Everything in Edge",
        "Unlimited AI credits",
        "Custom model builder",
        "Hedge & arbitrage tools",
        "Priority processing",
        "Direct support",
      ],
      limitations: [],
    },
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
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min((dailyUsage / 25) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold" data-testid="text-daily-usage">
              {dailyUsage}/25
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={tier.name === "Pro" ? "ring-2 ring-primary/50" : ""}
            data-testid={`tier-card-${tier.name.toLowerCase()}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                {tier.icon}
                <CardTitle className="text-base">{tier.name}</CardTitle>
              </div>
              {tier.current && (
                <Badge variant="outline" className="text-xs" data-testid="badge-current-plan">
                  Current Plan
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-2xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                )}
              </div>

              <div className="space-y-2">
                {tier.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
                {tier.limitations.map((lim) => (
                  <div key={lim} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{lim}</span>
                  </div>
                ))}
              </div>

              {!tier.current && (
                <Button
                  className="w-full"
                  variant={tier.name === "Pro" ? "default" : "outline"}
                  onClick={() => (window.location.href = "/pricing")}
                  data-testid={`button-upgrade-${tier.name.toLowerCase()}`}
                >
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

export default function SharedTickets() {
  const [location] = useLocation();
  const hasSharedId = typeof window !== "undefined" && window.location.search.includes("id=");
  const defaultTab = hasSharedId ? "share" : "share";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" data-testid="shared-tickets-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Share2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Shared Tickets
        </h1>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="share" data-testid="tab-share">
            <Share2 className="w-4 h-4 mr-1.5" />
            Share a Ticket
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Trophy className="w-4 h-4 mr-1.5" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">
            <Crown className="w-4 h-4 mr-1.5" />
            Tier Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="share">
          <ShareTab />
        </TabsContent>
        <TabsContent value="leaderboard">
          <LeaderboardTab />
        </TabsContent>
        <TabsContent value="tiers">
          <TierAccessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
