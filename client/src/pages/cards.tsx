import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingCard } from "@/components/trading-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, ShoppingBag, History, Sparkles, Brain, RefreshCw, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";

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

  const { data: authData } = useQuery<{ isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
  });
  const isAdmin = authData?.isAdmin ?? false;

  const { data: collection, isLoading: isCollectionLoading } = useQuery<UserCardCollection[]>({
    queryKey: ["/api/cards/collection"],
  });

  const { data: marketplace, isLoading: isMarketplaceLoading } = useQuery<any[]>({
    queryKey: ["/api/cards/marketplace"],
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
    enabled: isAdmin,
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
      {/* Header & Pack Drops */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Sors Intelligence Cards
          </h1>
          <p className="text-muted-foreground font-medium">Collect, trade, and showcase your best-performing picks.</p>
        </div>

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

      {/* Pack Reveal Modal */}
      <Dialog open={openedPackCards !== null} onOpenChange={(open) => !open && closePackReveal()}>
        <DialogContent className="max-w-5xl bg-black/90 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-primary tracking-tighter uppercase">
              Pack Reveal
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-8 py-10">
            <div className="flex flex-wrap justify-center gap-6">
              {openedPackCards?.map((item, idx) => (
                <div key={item.collection.id} className="relative w-[240px] h-[340px]">
                  <TradingCard
                    card={item.card}
                    instanceNumber={item.collection.instanceNumber}
                    isFlippable={true}
                    isFlipped={!revealedIndices.includes(idx)}
                    onFlip={() => handleReveal(idx)}
                  />
                  {!revealedIndices.includes(idx) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Button variant="ghost" className="text-white font-black bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60">
                        REVEAL
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {revealedIndices.length === openedPackCards?.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
              >
                <Button onClick={closePackReveal} className="font-black px-8 h-12">
                  ADD TO COLLECTION
                </Button>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="collection" className="space-y-6">
        <TabsList className={`bg-muted/50 p-1 w-full ${isAdmin ? "max-w-2xl" : "max-w-md"}`}>
          <TabsTrigger value="collection" className="flex-1 font-bold gap-2">
            <Users className="w-4 h-4" /> My Collection
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex-1 font-bold gap-2">
            <ShoppingBag className="w-4 h-4" /> Marketplace
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex-1 font-bold gap-2">
            <History className="w-4 h-4" /> Trades
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="showcase-preview" className="flex-1 font-bold gap-2 text-amber-400" data-testid="tab-showcase-preview">
              <Eye className="w-4 h-4" /> Showcase Preview
            </TabsTrigger>
          )}
        </TabsList>


        <TabsContent value="collection" className="space-y-6">
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
                <Button onClick={() => openPackMutation.mutate()} disabled={!packStatus?.available} className="font-bold">
                  Open Your First Pack
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
              {collection?.map((item) => (
                <div key={item.collection.id} className="w-[280px] h-[400px]">
                  <TradingCard
                    card={item.card}
                    instanceNumber={item.collection.instanceNumber}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
            {isMarketplaceLoading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="w-[280px] h-[400px] rounded-2xl" />)
            ) : marketplace?.map((card) => (
              <div key={card.id} className="w-[280px] h-[400px]">
                <TradingCard card={card} />
              </div>
            ))}
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
    </div>
  );
}
