import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingCard } from "@/components/trading-card";
import { CardStackDeck } from "@/components/card-stack-deck";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, ShoppingBag, History, Sparkles, Brain, RefreshCw, Eye, Settings2, Flame, Star, CheckCircle2, XCircle, Globe, Ticket, TrendingUp, Clock, Award, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { TierGate } from "@/components/tier-gate";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PackRipReveal } from "@/components/pack-rip-reveal";
import { formatDistanceToNow } from "date-fns";

interface UserCardCollection {
  collection: {
    id: number;
    userId: number;
    cardId: string;
    instanceNumber: number;
    acquiredVia: string;
    acquiredAt: string;
    isShowcase: boolean;
  };
  card: {
    id: string;
    sport: string;
    pick: string;
    grade: string;
    betType: string;
    odds: number;
    confidence: number;
    ev: number;
    game: string;
    gameTime: string;
    maxCopies: number | null;
    copiesIssued: number | null;
    settledResult: string | null;
  };
}

interface Trade {
  id: number;
  fromUserId: number;
  toUserId: number;
  offeredCollectionIds: number[];
  requestedCardId: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
}

interface ShowcaseLeg {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  result: "won" | "lost";
}

interface ShowcaseTicket {
  id: string;
  date: string;
  result: "won" | "lost";
  legs: ShowcaseLeg[];
  combinedOdds: number;
  stake: number;
  payout: number;
  profit: number;
}

export default function CardsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openedPackCards, setOpenedPackCards] = useState<UserCardCollection[] | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [rarityGuideOpen, setRarityGuideOpen] = useState(false);

  const { data: authData } = useQuery<{ isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
  });
  const isAdmin = authData?.isAdmin ?? false;

  const { data: collection, isLoading: isCollectionLoading } = useQuery<UserCardCollection[]>({
    queryKey: ["/api/cards/collection"],
  });

  const { data: communityFeed, isLoading: isCommunityLoading } = useQuery<{
    collection: { id: number; userId: number; cardId: string; instanceNumber: number; isPublicShowcase: boolean; isFeatured: boolean | null };
    card: { id: string; sport: string; pick: string; grade: string; betType: string; odds: number; confidence: number; ev: number; game: string; gameTime: string; maxCopies: number | null; copiesIssued: number | null; settledResult: string | null; cardType?: string };
    username: string;
  }[]>({
    queryKey: ["/api/cards/community/feed"],
  });

  const { data: trades, isLoading: isTradesLoading } = useQuery<Trade[]>({
    queryKey: ["/api/cards/trades"],
  });

  const { data: packStatus } = useQuery<{ available: boolean; remainingToday: number; nextPackAt: string }>({
    queryKey: ["/api/cards/packs/available"],
  });

  const { data: showcaseData, isLoading: isShowcaseLoading, refetch: refetchShowcase } = useQuery<{
    tickets: ShowcaseTicket[];
    stats: { winning: number; losing: number };
  }>({
    queryKey: ["/api/showcase-tickets"],
  });

  const { data: lctData, isLoading: isLctLoading } = useQuery<{
    history: Array<{
      id: number; date: string; ticketId: string; legs: any[];
      totalLegs: number; outcome: string; wonLegs: number;
      settledAt: string | null; mintedCardId: string | null; createdAt: string;
    }>;
    stats: { total: number; wins: number; losses: number; pending: number; winRate: number; streak: number; streakType: string };
  }>({
    queryKey: ["/api/lct-track-record"],
  });

  const openPackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards/packs/open");
      return res.json();
    },
    onSuccess: (newCards) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards/collection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards/packs/available"] });
      setOpenedPackCards(newCards);
      setRevealedIndices([]);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to open pack",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleReveal = (index: number) => {
    if (!revealedIndices.includes(index)) {
      setRevealedIndices([...revealedIndices, index]);
    }
  };

  const closePackReveal = () => {
    setOpenedPackCards(null);
    setRevealedIndices([]);
  };

  const showcaseCards = (showcaseData?.tickets ?? []).flatMap((ticket, tIdx) =>
    ticket.legs.map((leg, lIdx) => ({
      id: `showcase-${ticket.id}-${lIdx}`,
      sport: leg.sport,
      pick: leg.pick,
      grade: leg.grade,
      betType: leg.betType,
      odds: leg.odds,
      confidence: leg.confidence,
      ev: Math.round(leg.confidence * 0.18),
      game: leg.game,
      gameTime: ticket.date + "T20:00:00",
      maxCopies: 99,
      copiesIssued: tIdx + lIdx + 1,
      settledResult: leg.result as string,
      ticketResult: ticket.result,
    }))
  );

  return (
    <div className="container max-w-screen-2xl mx-auto py-6 px-4 space-y-8" data-testid="cards-page">
      <PageHero
        icon={<Trophy className="w-6 h-6" />}
        title="Sors Intelligence Cards"
        subtitle="Collect, trade, and showcase your best-performing picks"
        variant="gold"
      />

      {/* === Rarity Guide === */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(251,191,36,0.22)", background: "rgba(10,10,10,0.85)" }}
        data-testid="rarity-guide"
      >
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 gap-3"
          onClick={() => setRarityGuideOpen(v => !v)}
          data-testid="button-rarity-guide-toggle"
          style={{ background: "transparent", cursor: "pointer" }}
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4" style={{ color: "rgba(251,191,36,0.70)" }} />
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: "rgba(251,191,36,0.85)" }}>
              Card Color & Grade Guide
            </span>
            <span className="text-xs font-medium text-white/35">— What do the colors mean?</span>
          </div>
          {rarityGuideOpen
            ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
          }
        </button>

        {rarityGuideOpen && (
          <div
            className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {[
              {
                grade: "S+",
                label: "Life Changer™",
                desc: "Auto-minted when the Daily Life Changer Ticket wins. The rarest card in existence.",
                color: "#D946EF",
                glow: "rgba(217,70,239,0.55)",
                bg: "rgba(217,70,239,0.12)",
                border: "rgba(217,70,239,0.50)",
              },
              {
                grade: "A+",
                label: "Legendary",
                desc: "Top 1% picks with exceptional edge and EV. Maximum conviction plays.",
                color: "#FBBF24",
                glow: "rgba(251,191,36,0.50)",
                bg: "rgba(251,191,36,0.10)",
                border: "rgba(251,191,36,0.45)",
              },
              {
                grade: "A",
                label: "Rare",
                desc: "Top 5% of picks. High EV, strong confidence, and multi-factor alignment.",
                color: "#34D399",
                glow: "rgba(52,211,153,0.45)",
                bg: "rgba(52,211,153,0.09)",
                border: "rgba(52,211,153,0.38)",
              },
              {
                grade: "B+",
                label: "Uncommon",
                desc: "Top 15% picks. Solid value plays with clear model edge and positive EV.",
                color: "#2DD4BF",
                glow: "rgba(45,212,191,0.40)",
                bg: "rgba(45,212,191,0.08)",
                border: "rgba(45,212,191,0.32)",
              },
              {
                grade: "B",
                label: "Standard+",
                desc: "Top 25% picks. Good value — above-average picks with proven model signals.",
                color: "#60A5FA",
                glow: "rgba(96,165,250,0.38)",
                bg: "rgba(96,165,250,0.07)",
                border: "rgba(96,165,250,0.28)",
              },
              {
                grade: "C+",
                label: "Standard",
                desc: "Average-tier picks with mild edge. Suitable for lower-risk parlay legs.",
                color: "#FACC15",
                glow: "rgba(250,204,21,0.32)",
                bg: "rgba(250,204,21,0.06)",
                border: "rgba(250,204,21,0.25)",
              },
              {
                grade: "C",
                label: "Common",
                desc: "Baseline model output. Lower edge picks — use with caution in parlays.",
                color: "#94A3B8",
                glow: "rgba(148,163,184,0.25)",
                bg: "rgba(148,163,184,0.05)",
                border: "rgba(148,163,184,0.20)",
              },
            ].map(({ grade, label, desc, color, glow, bg, border }) => (
              <div
                key={grade}
                className="rounded-lg p-3 flex flex-col gap-2"
                style={{ background: bg, border: `1px solid ${border}` }}
                data-testid={`rarity-tier-${grade.replace("+", "plus")}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: bg,
                      border: `2px solid ${border}`,
                      boxShadow: `0 0 12px ${glow}`,
                    }}
                  >
                    <span
                      className="text-sm font-black"
                      style={{ color, textShadow: `0 0 8px ${glow}` }}
                    >{grade}</span>
                  </div>
                  <span
                    className="text-[11px] font-black uppercase tracking-wider"
                    style={{ color }}
                  >{label}</span>
                </div>
                <p className="text-[10px] text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <TierGate
        required="elite"
        label="Sors Intelligence Cards"
        description="Open packs, collect cryptographically verified pick cards, showcase your wins on the community feed, and build your Discord-proof win portfolio — Edge tier and above."
      >

      {/* Pack Drops */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div />

        <Card className="bg-primary/5 border-primary/20 shrink-0">
          <CardContent className="pt-6 flex items-center gap-6">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-primary/80">Pack Drop</p>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-lg font-black">{packStatus?.remainingToday || 0} Left</span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => openPackMutation.mutate()}
              disabled={!packStatus?.available || openPackMutation.isPending}
              className="font-black tracking-wider hover-elevate active-elevate-2"
              data-testid="button-open-pack"
            >
              {openPackMutation.isPending ? "OPENING..." : "OPEN PACK"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pack Reveal Overlay */}
      {openedPackCards && (
        <PackRipReveal
          cards={openedPackCards}
          onClose={closePackReveal}
        />
      )}

      <Tabs defaultValue="system-record" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full flex flex-wrap h-auto gap-0.5 max-w-2xl">
          <TabsTrigger value="system-record" className="flex-1 min-w-[120px] font-bold gap-1.5 text-amber-400" data-testid="tab-system-record">
            <Settings2 className="w-4 h-4" /> System Record
          </TabsTrigger>
          <TabsTrigger value="collection" className="flex-1 min-w-[120px] font-bold gap-1.5" data-testid="tab-collection">
            <Users className="w-4 h-4" /> My Collection
          </TabsTrigger>
          <TabsTrigger value="community" className="flex-1 min-w-[100px] font-bold gap-1.5" data-testid="tab-community">
            <Globe className="w-4 h-4" /> Community
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex-1 min-w-[80px] font-bold gap-1.5" data-testid="tab-trades">
            <History className="w-4 h-4" /> Trades
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="showcase-preview" className="flex-1 min-w-[80px] font-bold gap-1.5 text-amber-400/70 text-xs" data-testid="tab-showcase-preview">
              <Eye className="w-3.5 h-3.5" /> Preview
            </TabsTrigger>
          )}
        </TabsList>


        {/* ─── SYSTEM TRACK RECORD ─────────────────────────────────── */}
        <TabsContent value="system-record" className="space-y-6" data-testid="content-system-record">
          {/* Identity banner */}
          <div
            className="relative rounded-2xl overflow-hidden p-5 flex items-center gap-5 border"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(16,24,40,0.95) 60%)",
              borderColor: "rgba(251,191,36,0.22)",
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(251,191,36,0.10)", border: "2px solid rgba(251,191,36,0.35)" }}>
              <Settings2 className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-amber-400">SORS System Track Record</h2>
                <Badge className="text-[10px] border bg-amber-500/15 text-amber-400 border-amber-400/30 font-black">LIVE ENGINE</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Every card here was generated by the Sors 46-Factor Intelligence Engine. Real picks. Real results.
              </p>
            </div>
            {showcaseData && (
              <div className="hidden md:flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-xl font-black text-emerald-400">{showcaseData.stats.winning}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-red-400">{showcaseData.stats.losing}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-amber-400">{showcaseCards.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Cards</p>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => refetchShowcase()} disabled={isShowcaseLoading}
              className="shrink-0 border-amber-400/30 text-amber-400" data-testid="button-refresh-system-record">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isShowcaseLoading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>

          {isShowcaseLoading ? (
            <div className="flex justify-center py-12">
              <Skeleton className="w-[280px] aspect-[2/3] rounded-2xl" />
            </div>
          ) : showcaseCards.length === 0 ? (
            <Card className="border-dashed border-2 bg-amber-400/5 border-amber-400/20">
              <CardContent className="py-16 text-center space-y-3">
                <Settings2 className="w-10 h-10 mx-auto text-amber-400 opacity-30" />
                <div>
                  <h3 className="font-bold">No system cards loaded yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">The Sors engine generates cards from settled picks. Check back after picks settle.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CardStackDeck
              cardLabel="card"
              cards={showcaseCards.map((card) => (
                <div key={card.id} className="w-full h-full" data-testid={`card-system-${card.id}`}>
                  <TradingCard
                    card={{ ...card, cardType: "system" }}
                    instanceNumber={1}
                    isFlippable
                  />
                </div>
              ))}
            />
          )}

          {/* ─── LIFE CHANGER™ TRACKER ──────────────────────────────── */}
          <div className="mt-10 space-y-4">
            {/* LCT Section Header */}
            <div
              className="relative rounded-2xl overflow-hidden p-5 flex items-center gap-4 border"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(251,191,36,0.06) 50%, rgba(16,24,40,0.98) 100%)",
                borderColor: "rgba(16,185,129,0.25)",
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.35)" }}>
                <Ticket className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-emerald-400">LIFE CHANGER™ Track Record</h3>
                  <Badge className="text-[10px] border bg-emerald-500/10 text-emerald-400 border-emerald-400/30 font-black">SEPARATE TRACKER</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daily Life Changer™ tickets tracked independently. When one hits — a legendary card is auto-minted and featured in the showcase.
                </p>
              </div>
              {lctData && (
                <div className="hidden md:flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-black text-emerald-400">{lctData.stats.wins}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Hits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-red-400">{lctData.stats.losses}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Misses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-amber-400">{lctData.stats.winRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Hit Rate</p>
                  </div>
                  {lctData.stats.streak > 0 && (
                    <div className="text-center">
                      <p className={`text-xl font-black ${lctData.stats.streakType === "win" ? "text-emerald-400" : "text-red-400"}`}>
                        {lctData.stats.streakType === "win" ? "🔥" : ""}{lctData.stats.streak}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Streak</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LCT History */}
            {isLctLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-14 rounded-xl" />)}
              </div>
            ) : !lctData || lctData.history.length === 0 ? (
              <Card className="border-dashed border-2 bg-emerald-400/5 border-emerald-400/20">
                <CardContent className="py-10 text-center space-y-2">
                  <Ticket className="w-8 h-8 mx-auto text-emerald-400 opacity-30" />
                  <div>
                    <h4 className="font-bold text-sm">No Life Changer™ tickets tracked yet</h4>
                    <p className="text-xs text-muted-foreground mt-1">Today's ticket will be logged the first time you view it. Check back tomorrow for results.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2" data-testid="lct-history-list">
                {lctData.history.slice(0, 30).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                    style={{
                      borderColor: entry.outcome === "won"
                        ? "rgba(16,185,129,0.3)"
                        : entry.outcome === "lost"
                          ? "rgba(239,68,68,0.3)"
                          : "rgba(255,255,255,0.08)",
                      background: entry.outcome === "won"
                        ? "rgba(16,185,129,0.05)"
                        : entry.outcome === "lost"
                          ? "rgba(239,68,68,0.04)"
                          : "rgba(255,255,255,0.02)",
                    }}
                    data-testid={`lct-entry-${entry.id}`}
                  >
                    <div className="shrink-0">
                      {entry.outcome === "won" ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : entry.outcome === "lost" ? (
                        <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-red-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                        <Badge
                          className={`text-[10px] font-black ${
                            entry.outcome === "won"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/30"
                              : entry.outcome === "lost"
                                ? "bg-red-500/10 text-red-400 border-red-400/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-400/30"
                          } border`}
                        >
                          {entry.outcome === "won" ? "🏆 HIT" : entry.outcome === "lost" ? "MISS" : "PENDING"}
                        </Badge>
                        {entry.mintedCardId && (
                          <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-400/30">
                            <Award className="w-2.5 h-2.5 mr-1" />Card Minted
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.totalLegs}-leg parlay
                        {entry.outcome !== "pending" && entry.wonLegs > 0 && ` · ${entry.wonLegs}/${entry.totalLegs} legs won`}
                      </p>
                    </div>
                    {entry.outcome === "pending" && (
                      <Badge className="shrink-0 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-400/20">Awaiting Results</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── MY COLLECTION ───────────────────────────────────────── */}
        <TabsContent value="collection" className="space-y-6" data-testid="content-collection">
          {/* Member collection header */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-muted/20">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-400/10 border border-blue-400/20 shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">Member Collection</span>
                <Badge className="text-[10px] bg-blue-400/10 text-blue-400 border border-blue-400/20">EARNED</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Cards you earned by opening packs. Showcase winners to the community.</p>
            </div>
            {collection && <span className="text-sm font-bold text-muted-foreground shrink-0">{collection.length} cards</span>}
          </div>

          {isCollectionLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-[280px] h-[400px] rounded-2xl mx-auto" />
              ))}
            </div>
          ) : collection?.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-20 text-center space-y-4">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">Your collection is empty</h3>
                  <p className="text-muted-foreground">Open your first daily pack to start collecting Sors Intelligence cards.</p>
                </div>
                <Button onClick={() => openPackMutation.mutate()} disabled={!packStatus?.available} className="font-bold hover-elevate active-elevate-2">
                  Open Your First Pack
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {collection?.map((item) => (
                <div key={item.collection.id} className="w-full aspect-[2/3]">
                  <TradingCard
                    card={{ ...item.card, cardType: (item.card as any).cardType || "member" }}
                    instanceNumber={item.collection.instanceNumber}
                    collectionId={item.collection.id}
                    isPublicShowcase={(item.collection as any).isPublicShowcase}
                    isFlippable={true}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── COMMUNITY SHOWCASE ──────────────────────────────────── */}
        <TabsContent value="community" className="space-y-0" data-testid="content-community">
          {/* Trophy Room Wrapper */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 100%, rgba(251,191,36,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(120,53,15,0.15) 0%, transparent 50%), linear-gradient(180deg, #050404 0%, #0a0807 60%, #050504 100%)",
              minHeight: "600px",
            }}
          >
            {/* Bokeh spotlight lights */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", top: "-80px", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 65%)", filter: "blur(30px)" }} />
              <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", top: "30%", left: "15%", background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 65%)", filter: "blur(20px)" }} />
              <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", top: "30%", right: "15%", background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 65%)", filter: "blur(20px)" }} />
              <div style={{ position: "absolute", width: "100%", height: "1px", top: "3px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.4) 30%, rgba(251,191,36,0.7) 50%, rgba(251,191,36,0.4) 70%, transparent)" }} />
            </div>

            {/* Showroom header */}
            <div className="relative z-10 pt-8 pb-4 px-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.6))" }} />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.35em", color: "rgba(251,191,36,0.5)", textTransform: "uppercase" }}>SORS MAXIMA™</span>
                <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, rgba(251,191,36,0.6), transparent)" }} />
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.05em", color: "rgba(255,255,255,0.95)", textTransform: "uppercase", lineHeight: 1.1 }}>
                THE VAULT
              </h2>
              <p style={{ fontSize: 11, color: "rgba(251,191,36,0.55)", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>
                Community Showcase · Member Verified Picks
              </p>
              {communityFeed && communityFeed.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-lg font-black text-amber-400">{communityFeed.length}</p>
                    <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Cards</p>
                  </div>
                  <div style={{ width: 1, height: 32, background: "rgba(251,191,36,0.15)" }} />
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-400">{communityFeed.filter(i => i.card.settledResult === "won").length}</p>
                    <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Winners</p>
                  </div>
                  <div style={{ width: 1, height: 32, background: "rgba(251,191,36,0.15)" }} />
                  <div className="text-center">
                    <p className="text-lg font-black text-fuchsia-400">{communityFeed.filter(i => i.collection.isFeatured).length}</p>
                    <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Featured</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ margin: "0 24px 24px", height: 1, background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.25) 30%, rgba(251,191,36,0.25) 70%, transparent)" }} />

            {/* Card display */}
            <div className="relative z-10 pb-10 px-4">
              {isCommunityLoading ? (
                <div className="flex justify-center py-12">
                  <Skeleton className="w-[280px] aspect-[2/3] rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
              ) : !communityFeed || communityFeed.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div style={{ fontSize: 48, opacity: 0.25 }}>🏆</div>
                  <div>
                    <h3 className="font-black text-white/60 text-lg">The Vault Awaits</h3>
                    <p className="text-sm text-white/30 mt-1">Be the first to showcase a verified winning card.</p>
                  </div>
                </div>
              ) : (
                <CardStackDeck
                  cardLabel="card"
                  cards={[
                    ...communityFeed.filter(i => i.collection.isFeatured),
                    ...communityFeed.filter(i => !i.collection.isFeatured),
                  ].map((item) => (
                    <div key={item.collection.id} className="w-full h-full" data-testid={`card-community-${item.collection.id}`}>
                      <TradingCard
                        card={{ ...item.card, cardType: (item.card as any).cardType || "member" }}
                        instanceNumber={item.collection.instanceNumber}
                        isFeatured={item.collection.isFeatured ?? false}
                        isFlippable
                      />
                    </div>
                  ))}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          {isTradesLoading ? (
            <Skeleton className="w-full h-40" />
          ) : trades?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <History className="w-12 h-12 mx-auto opacity-20" />
              <p>No active trade offers found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trades?.map((trade) => (
                <Card key={trade.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-black uppercase tracking-wider">
                        Trade Offer #{trade.id}
                      </CardTitle>
                      <CardDescription>
                        {new Date(trade.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge variant={trade.status === "pending" ? "default" : trade.status === "accepted" ? "outline" : "secondary"}>
                      {trade.status.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium mb-4">{trade.message || "No message included."}</p>
                    <div className="flex gap-2">
                      {trade.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" className="font-bold">Accept Offer</Button>
                          <Button size="sm" variant="outline" className="font-bold">Decline</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="showcase-preview" className="space-y-6" data-testid="content-showcase-preview">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400" />
                  Showcase Card Preview
                  <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 border font-black">
                    ADMIN ONLY
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Preview all cards generated from showcase tickets — {showcaseCards.length} cards from{" "}
                  {showcaseData?.tickets.length ?? 0} tickets
                  ({showcaseData?.stats.winning ?? 0}W / {showcaseData?.stats.losing ?? 0}L).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => refetchShowcase()}
                disabled={isShowcaseLoading}
                data-testid="button-refresh-showcase"
              >
                <RefreshCw className={`w-4 h-4 ${isShowcaseLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {isShowcaseLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="w-[280px] h-[400px] rounded-2xl" />
                ))}
              </div>
            ) : showcaseCards.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/20">
                <CardContent className="py-16 text-center space-y-3">
                  <Eye className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                  <div>
                    <h3 className="font-bold">No showcase tickets loaded</h3>
                    <p className="text-sm text-muted-foreground mt-1">Showcase tickets will appear here once the system generates them.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border bg-muted/20">
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">{showcaseData?.tickets.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-400">{showcaseData?.stats.winning ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Winning</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-red-400">{showcaseData?.stats.losing ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Losing</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-400">{showcaseCards.length}</p>
                    <p className="text-xs text-muted-foreground">Total Cards</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
                  {showcaseCards.map((card) => (
                    <div key={card.id} className="w-[280px] h-[400px]" data-testid={`card-showcase-preview-${card.id}`}>
                      <TradingCard card={card} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      </TierGate>
    </div>
  );
}
