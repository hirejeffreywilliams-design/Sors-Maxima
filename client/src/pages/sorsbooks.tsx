import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Landmark, Plus, TrendingUp, TrendingDown, DollarSign, BarChart3,
  ExternalLink, Trophy, Activity, Target, Edit2, Trash2, RefreshCw,
  Star, ChevronRight, CheckCircle2, Crown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

interface BookAccount {
  id: number | null;
  sportsbookName: string;
  key: string;
  color: string;
  url: string | null;
  accountBalance: number | null;
  pendingBets: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfit: number;
  isActive: boolean;
  netProfit: number;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  historyOnly?: boolean;
}

interface BooksSummary {
  totalBalance: number;
  totalProfit: number;
  totalBets: number;
}

interface BestLinesGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bestHome: { book: string; odds: number } | null;
  bestAway: { book: string; odds: number } | null;
  bestHomeSpread: { book: string; odds: number; points: number } | null;
  bookLines: { book: string; moneyline: any; spread: any; total: any }[];
}

interface CatalogBook {
  key: string;
  name: string;
  color: string;
  url: string;
}

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

function formatMoney(n: number) {
  return n >= 0 ? `+$${Math.abs(n).toFixed(0)}` : `-$${Math.abs(n).toFixed(0)}`;
}

function BookInitials({ name, color }: { name: string; color: string }) {
  const initials = name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function AddBookDialog({ catalog }: { catalog: CatalogBook[] }) {
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [balance, setBalance] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: { sportsbookName: string; accountBalance: number }) => {
      const r = await apiRequest("POST", "/api/sportsbooks", data);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sorsbooks/stats"] });
      toast({ title: "Book added!", description: "Your sportsbook has been connected to Sors." });
      setOpen(false);
      setSelectedBook("");
      setBalance("");
    },
    onError: () => toast({ title: "Error", description: "Failed to add sportsbook.", variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!selectedBook) return;
    const book = catalog.find(b => b.key === selectedBook);
    if (!book) return;
    addMutation.mutate({ sportsbookName: book.name, accountBalance: parseFloat(balance) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" data-testid="button-add-book">
          <Plus className="w-3.5 h-3.5" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            Connect a Sportsbook
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Sportsbook</Label>
            <Select value={selectedBook} onValueChange={setSelectedBook}>
              <SelectTrigger data-testid="select-book-name">
                <SelectValue placeholder="Choose your sportsbook…" />
              </SelectTrigger>
              <SelectContent>
                {catalog.map(b => (
                  <SelectItem key={b.key} value={b.key}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Current Balance ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              data-testid="input-book-balance"
            />
            <p className="text-[10px] text-muted-foreground">
              This is tracked locally. Sors never accesses your sportsbook account.
            </p>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!selectedBook || addMutation.isPending}
            className="w-full"
            data-testid="button-confirm-add-book"
          >
            {addMutation.isPending ? "Connecting…" : "Connect Book"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookCard({ account, onUpdate, onDelete }: {
  account: BookAccount;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [editBalance, setEditBalance] = useState(false);
  const [newBal, setNewBal] = useState(String(account.accountBalance ?? ""));

  const pnlPositive = (account.netProfit ?? 0) >= 0;
  const roi = account.totalStaked > 0 ? ((account.netProfit / account.totalStaked) * 100).toFixed(1) : null;

  return (
    <Card
      className="border overflow-hidden"
      style={{ borderColor: `${account.color}30` }}
      data-testid={`card-book-${account.key}`}
    >
      {/* Color accent top bar */}
      <div className="h-1 w-full" style={{ backgroundColor: account.color }} />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <BookInitials name={account.sportsbookName} color={account.color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm">{account.sportsbookName}</p>
              {account.historyOnly && (
                <Badge variant="outline" className="text-[9px] px-1.5">History Only</Badge>
              )}
              {account.url && (
                <a href={account.url} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {/* Balance row */}
            {account.accountBalance !== null && (
              <div className="flex items-center gap-2">
                {editBalance ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      className="h-6 w-24 text-xs px-2"
                      value={newBal}
                      onChange={e => setNewBal(e.target.value)}
                      data-testid={`input-update-balance-${account.key}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (account.id) onUpdate(account.id, { accountBalance: parseFloat(newBal) || 0 });
                        setEditBalance(false);
                      }}
                    >Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditBalance(false)}>×</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black tabular-nums">${account.accountBalance.toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground">balance</span>
                    {account.id && (
                      <button onClick={() => setEditBalance(true)} className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {account.id && (
            <button
              onClick={() => onDelete(account.id!)}
              className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
              data-testid={`button-delete-book-${account.key}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stats row */}
        {account.totalBets > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="text-center">
              <p className={`text-sm font-bold tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {formatMoney(account.netProfit)}
              </p>
              <p className="text-[9px] text-muted-foreground">Net P&L</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold tabular-nums">{account.winRate}%</p>
              <p className="text-[9px] text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold tabular-nums">{account.wins}–{account.losses}</p>
              <p className="text-[9px] text-muted-foreground">Record</p>
            </div>
            <div className="text-center">
              <p className={`text-sm font-bold tabular-nums ${roi && parseFloat(roi) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {roi ? `${roi}%` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground">ROI</p>
            </div>
          </div>
        )}
        {account.totalBets === 0 && !account.historyOnly && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Log your first bet at this book to see performance stats.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SportBadge({ sport }: { sport: string }) {
  const map: Record<string, string> = {
    basketball_nba: "NBA",
    icehockey_nhl: "NHL",
    americanfootball_nfl: "NFL",
    baseball_mlb: "MLB",
  };
  return <Badge variant="secondary" className="text-[9px] px-1.5">{map[sport] || sport.toUpperCase()}</Badge>;
}

function BestLinesPanel({ games }: { games: BestLinesGame[] }) {
  const [selectedSport, setSelectedSport] = useState("all");
  const sports = ["all", ...Array.from(new Set(games.map(g => g.sport)))];

  const filtered = selectedSport === "all" ? games : games.filter(g => g.sport === selectedSport);

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Live line data unavailable right now.</p>
        <p className="text-xs mt-1">Lines update automatically every 2 minutes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSport(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${selectedSport === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            data-testid={`filter-sport-${s}`}
          >
            {s === "all" ? "All Sports" : s.split("_").pop()?.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(game => (
          <Card key={game.id} className="border" data-testid={`game-lines-${game.id}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <SportBadge sport={game.sport} />
                <p className="text-xs text-muted-foreground truncate">
                  {game.awayTeam} @ {game.homeTeam}
                </p>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                  {new Date(game.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>

              {/* Best available callout */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {game.bestHome && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-medium">BEST HOME ML</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{formatOdds(game.bestHome.odds)}</p>
                    <p className="text-[9px] text-muted-foreground">{game.bestHome.book}</p>
                  </div>
                )}
                {game.bestAway && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-medium">BEST AWAY ML</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{formatOdds(game.bestAway.odds)}</p>
                    <p className="text-[9px] text-muted-foreground">{game.bestAway.book}</p>
                  </div>
                )}
              </div>

              {/* Per-book lines table */}
              {game.bookLines.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-medium">Book</th>
                        <th className="text-right pr-2 font-medium">{game.awayTeam.split(" ").pop()} ML</th>
                        <th className="text-right pr-2 font-medium">{game.homeTeam.split(" ").pop()} ML</th>
                        <th className="text-right font-medium">Spread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.bookLines.map(bl => (
                        <tr key={bl.book} className="border-b border-border/30 last:border-0">
                          <td className="py-1 pr-2 font-medium text-foreground/80">{bl.book}</td>
                          <td className={`text-right pr-2 tabular-nums ${
                            game.bestAway?.book === bl.book ? "text-emerald-400 font-bold" : ""
                          }`}>
                            {bl.moneyline ? formatOdds(bl.moneyline.away) : "—"}
                          </td>
                          <td className={`text-right pr-2 tabular-nums ${
                            game.bestHome?.book === bl.book ? "text-emerald-400 font-bold" : ""
                          }`}>
                            {bl.moneyline ? formatOdds(bl.moneyline.home) : "—"}
                          </td>
                          <td className="text-right tabular-nums text-muted-foreground">
                            {bl.spread ? `${bl.spread.homePoint > 0 ? "+" : ""}${bl.spread.homePoint}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SorsBooks() {
  useSEO({ title: "Sors Books", description: "Your personalized sportsbook intelligence hub" });

  const { toast } = useToast();

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery<{
    accounts: BookAccount[];
    summary: BooksSummary;
  }>({ queryKey: ["/api/sorsbooks/stats"] });

  const { data: linesData, isLoading: linesLoading } = useQuery<{ games: BestLinesGame[] }>({
    queryKey: ["/api/sorsbooks/best-lines"],
    refetchInterval: 120_000,
  });

  const { data: catalogData } = useQuery<CatalogBook[]>({
    queryKey: ["/api/sorsbooks/catalog"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiRequest("PUT", `/api/sportsbooks/${id}`, data);
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sorsbooks/stats"] }),
    onError: () => toast({ title: "Error", description: "Failed to update balance.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("DELETE", `/api/sportsbooks/${id}`);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sorsbooks/stats"] });
      toast({ title: "Removed", description: "Sportsbook disconnected." });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove book.", variant: "destructive" }),
  });

  const accounts = statsData?.accounts ?? [];
  const summary = statsData?.summary ?? { totalBalance: 0, totalProfit: 0, totalBets: 0 };
  const pnlPositive = summary.totalProfit >= 0;

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6" data-testid="page-sorsbooks">
      <PageHero
        icon={<Landmark className="w-6 h-6" />}
        title="Sors Books"
        badge="Intelligence Hub"
        subtitle="Track your sportsbook accounts, compare live lines, and maximize every bet"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchStats()}
              className="gap-1.5 text-muted-foreground"
              data-testid="button-refresh-stats"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            {catalogData && <AddBookDialog catalog={catalogData} />}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card data-testid="card-total-balance">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Balance</p>
            </div>
            <p className="text-2xl font-black tabular-nums">${summary.totalBalance.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">{accounts.filter(a => !a.historyOnly).length} books connected</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-pnl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {pnlPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              <p className="text-xs text-muted-foreground">Total P&L</p>
            </div>
            <p className={`text-2xl font-black tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
              {formatMoney(summary.totalProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">across all books</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-bets">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-muted-foreground">Tracked Bets</p>
            </div>
            <p className="text-2xl font-black tabular-nums">{summary.totalBets}</p>
            <p className="text-[10px] text-muted-foreground">with sportsbook attribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="books" className="space-y-4">
        <TabsList>
          <TabsTrigger value="books" data-testid="tab-books">My Books</TabsTrigger>
          <TabsTrigger value="lines" data-testid="tab-live-lines">Live Lines</TabsTrigger>
        </TabsList>

        {/* My Books tab */}
        <TabsContent value="books" className="space-y-4">
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Landmark className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No books connected yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Add your sportsbook accounts to track balances, compare performance, and see your P&L across all books.
                </p>
              </div>
              {catalogData && (
                <div className="flex justify-center">
                  <AddBookDialog catalog={catalogData} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((account, i) => (
                  <BookCard
                    key={account.id ?? `history-${i}`}
                    account={account}
                    onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>

              {/* Quick intel nudge */}
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Sors Line Shopping</p>
                      <p className="text-xs text-muted-foreground">
                        Switch to "Live Lines" to see which of your books has the best available odds for today's top picks.
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Live Lines tab */}
        <TabsContent value="lines" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Live Line Comparison</h3>
              <p className="text-xs text-muted-foreground">Best available odds per book, updated every 2 minutes.</p>
            </div>
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              Live
            </Badge>
          </div>

          {linesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border animate-pulse">
                  <CardContent className="p-3">
                    <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <BestLinesPanel games={linesData?.games ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
