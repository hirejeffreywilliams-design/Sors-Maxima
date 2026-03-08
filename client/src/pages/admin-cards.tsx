import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingCard } from "@/components/trading-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Sparkles, Users, BarChart2, Layers, RefreshCw, Search, Filter, CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/use-seo";

interface AdminCard {
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
  maxCopies: number;
  copiesIssued: number;
  settledResult: string | null;
  createdAt: string;
  owners: { userId: number; username: string; instanceNumber: number; acquiredVia: string }[];
}

interface CardStats {
  totalCards: number;
  totalCopies: number;
  totalCollectionEntries: number;
  bySport: Record<string, number>;
  byGrade: Record<string, number>;
  settledWon: number;
  settledLost: number;
  pending: number;
}

const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"];
const GRADE_COLOR: Record<string, string> = {
  "A+": "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  "A":  "text-green-400 border-green-400/40 bg-green-400/10",
  "A-": "text-lime-400 border-lime-400/40 bg-lime-400/10",
  "B+": "text-amber-400 border-amber-400/40 bg-amber-400/10",
  "B":  "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  "B-": "text-orange-400 border-orange-400/40 bg-orange-400/10",
  "C+": "text-red-400 border-red-400/40 bg-red-400/10",
  "C":  "text-rose-400 border-rose-400/40 bg-rose-400/10",
};

export default function AdminCardsVault() {
  useSEO({ title: "Cards Vault — Admin", description: "All minted Sors Intelligence Cards" });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [selectedCard, setSelectedCard] = useState<AdminCard | null>(null);

  const { data: cards, isLoading: cardsLoading } = useQuery<AdminCard[]>({
    queryKey: ["/api/cards/admin/all"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<CardStats>({
    queryKey: ["/api/cards/admin/stats"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards/admin/seed", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Seeded ${data.seeded} showcase cards`, description: "Cards added to your collection and public showcase." });
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/all"] });
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/cards/community/feed"] });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const filtered = (cards || []).filter((c) => {
    if (filterSport !== "all" && c.sport !== filterSport) return false;
    if (filterGrade !== "all" && c.grade !== filterGrade) return false;
    if (filterResult !== "all") {
      if (filterResult === "won" && c.settledResult !== "won") return false;
      if (filterResult === "lost" && c.settledResult !== "lost") return false;
      if (filterResult === "pending" && c.settledResult !== "pending" && c.settledResult !== null) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!c.pick.toLowerCase().includes(q) && !c.game.toLowerCase().includes(q) && !c.sport.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sports = [...new Set((cards || []).map((c) => c.sport))].sort();
  const grades = [...new Set((cards || []).map((c) => c.grade))].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Sors Cards Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every Intelligence Card minted on the platform — full visibility, ownership, and rarity data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["/api/cards/admin/all"] });
              qc.invalidateQueries({ queryKey: ["/api/cards/admin/stats"] });
            }}
            data-testid="button-refresh-cards"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            data-testid="button-seed-cards"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {seedMutation.isPending ? "Seeding…" : "Seed Showcase Cards"}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : stats ? (
          <>
            <StatCard icon={<Layers className="w-5 h-5 text-amber-400" />} label="Unique Cards" value={stats.totalCards} />
            <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Copies" value={stats.totalCopies} />
            <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Won" value={stats.settledWon} sub={stats.totalCards ? `${Math.round(stats.settledWon / stats.totalCards * 100)}% hit rate` : undefined} />
            <StatCard icon={<Clock className="w-5 h-5 text-amber-300" />} label="Pending" value={stats.pending} />
          </>
        ) : null}
      </div>

      {/* Sport + Grade breakdown */}
      {stats && !statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-primary" />By Sport</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.bySport).sort(([, a], [, b]) => b - a).map(([sport, count]) => (
                  <Badge key={sport} variant="outline" className="text-xs" data-testid={`badge-sport-${sport}`}>
                    {sport} <span className="ml-1 font-bold">{count}</span>
                  </Badge>
                ))}
                {Object.keys(stats.bySport).length === 0 && <span className="text-xs text-muted-foreground">No cards yet — click "Seed Showcase Cards"</span>}
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" />By Grade</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byGrade).sort(([a], [b]) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b)).map(([grade, count]) => (
                  <Badge key={grade} variant="outline" className={`text-xs border ${GRADE_COLOR[grade] || ""}`} data-testid={`badge-grade-${grade}`}>
                    {grade} <span className="ml-1 font-bold">{count}</span>
                  </Badge>
                ))}
                {Object.keys(stats.byGrade).length === 0 && <span className="text-xs text-muted-foreground">No grades yet</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search pick, game, sport…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-search-cards"
          />
        </div>
        <Select value={filterSport} onValueChange={setFilterSport}>
          <SelectTrigger className="w-32 h-9 text-sm" data-testid="select-filter-sport">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-28 h-9 text-sm" data-testid="select-filter-grade">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-32 h-9 text-sm" data-testid="select-filter-result">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterSport !== "all" || filterGrade !== "all" || filterResult !== "all") && (
          <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setSearch(""); setFilterSport("all"); setFilterGrade("all"); setFilterResult("all"); }}>
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} card{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Empty state */}
      {!cardsLoading && filtered.length === 0 && (
        <Card className="border-dashed py-16">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-amber-400/10">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{cards?.length === 0 ? "No cards minted yet" : "No cards match filters"}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {cards?.length === 0
                  ? "Seed showcase cards to populate the vault and show the community what Sors Intelligence Cards look like."
                  : "Try adjusting your filters or search query."}
              </p>
            </div>
            {cards?.length === 0 && (
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" data-testid="button-seed-cards-empty">
                <Sparkles className="w-4 h-4 mr-2" />
                Seed Showcase Cards
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card Grid */}
      {cardsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((c) => (
            <div key={c.id} className="space-y-2 cursor-pointer" onClick={() => setSelectedCard(selectedCard?.id === c.id ? null : c)} data-testid={`card-vault-${c.id}`}>
              <TradingCard
                card={c}
                instanceNumber={c.owners[0]?.instanceNumber ?? 1}
                isFlippable
              />
              {/* Ownership + rarity info below card */}
              <div className="space-y-1 px-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.copiesIssued}/{c.maxCopies} copies</span>
                  <ResultBadge result={c.settledResult} />
                </div>
                {c.owners.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Owned by: {c.owners.map((o) => o.username).join(", ")}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">Unowned</div>
                )}
                <div className="text-xs text-muted-foreground">
                  Minted {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card className="border border-border/50">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultBadge({ result }: { result: string | null }) {
  if (result === "won") return <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-400/30"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />WON</Badge>;
  if (result === "lost") return <Badge className="text-[10px] h-4 px-1.5 bg-red-500/15 text-red-400 border border-red-400/30"><XCircle className="w-2.5 h-2.5 mr-0.5" />LOST</Badge>;
  return <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-400 border border-amber-400/30"><Clock className="w-2.5 h-2.5 mr-0.5" />LIVE</Badge>;
}
