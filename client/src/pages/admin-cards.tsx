import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TradingCard } from "@/components/trading-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Sparkles, Users, BarChart2, Layers, RefreshCw, Search, Filter, CheckCircle2, Clock, XCircle, Zap, Shield, Lock, AlertTriangle, Eye, EyeOff, Star, FileText, Settings2, PlusCircle, Unlock, RotateCcw, Flame, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/use-seo";

const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "F"];
const GRADE_COLOR: Record<string, string> = {
  "A+": "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  "A": "text-green-400 border-green-400/40 bg-green-400/10",
  "A-": "text-lime-400 border-lime-400/40 bg-lime-400/10",
  "B+": "text-amber-400 border-amber-400/40 bg-amber-400/10",
  "B": "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  "B-": "text-orange-400 border-orange-400/40 bg-orange-400/10",
  "C+": "text-red-400 border-red-400/40 bg-red-400/10",
  "C": "text-rose-400 border-rose-400/40 bg-rose-400/10",
  "F": "text-slate-400 border-slate-400/40 bg-slate-400/10",
};
const TYPE_STYLE: Record<string, string> = {
  system: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  member: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  admin_seeded: "text-slate-400 bg-slate-400/10 border-slate-400/30",
};
const TYPE_LABEL: Record<string, string> = {
  system: "⚙ System",
  member: "👤 Member",
  admin_seeded: "★ Demo",
};

interface RegistryCard {
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
  cardType: string | null;
  isFrozen: boolean | null;
  frozenReason: string | null;
  createdAt: string;
  owners: {
    id: number;
    userId: number;
    username: string;
    instanceNumber: number;
    acquiredVia: string;
    isRevoked: boolean | null;
    isFeatured: boolean | null;
    isPublicShowcase: boolean | null;
  }[];
}

interface Analytics {
  totals: {
    total_cards: number;
    system_cards: number;
    member_cards: number;
    admin_seeded_cards: number;
    frozen_cards: number;
    won_cards: number;
    lost_cards: number;
    pending_cards: number;
  };
  collTotals: {
    total_copies: number;
    revoked_copies: number;
    showcased_copies: number;
    featured_copies: number;
    pack_opens: number;
  };
  gradeDistrib: { grade: string; count: number }[];
  sportDistrib: { sport: string; count: number }[];
  recentActivity: { log: any; username: string | null }[];
}

interface SecurityStats {
  verifyToday: { total: number; authentic: number; tampered: number; not_found: number };
  topIps: { ip_address: string; verifications: number }[];
  fraudAlerts: { id: number; alert_type: string; severity: string; username: string; details: any; created_at: string; reviewed: boolean }[];
  frozenCards: number;
  revokedCopies: number;
}

interface AuditLogRow {
  log: { id: number; actionType: string; cardId: string | null; collectionId: number | null; targetUserId: number | null; adminId: number | null; reason: string | null; metadata: any; createdAt: string };
  username: string | null;
}

interface CommunityCard {
  collection: { id: number; userId: number; cardId: string; instanceNumber: number; isPublicShowcase: boolean; isFeatured: boolean | null; isRevoked: boolean | null };
  card: { id: string; sport: string; pick: string; grade: string; betType: string; odds: number; confidence: number; ev: number; game: string; gameTime: string; maxCopies: number | null; copiesIssued: number | null; settledResult: string | null; cardType?: string };
  username: string;
}

export default function AdminCardsVault() {
  useSEO({ title: "Cards Vault — Admin", description: "Advanced Sors Intelligence Cards Vault" });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Registry state
  const [regSearch, setRegSearch] = useState("");
  const [regFilterType, setRegFilterType] = useState("all");
  const [regFilterGrade, setRegFilterGrade] = useState("all");
  const [regFilterStatus, setRegFilterStatus] = useState("all");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [targetCollId, setTargetCollId] = useState<number | null>(null);

  // Mint form state
  const [mintUsername, setMintUsername] = useState("");
  const [mintSport, setMintSport] = useState("NBA");
  const [mintPick, setMintPick] = useState("");
  const [mintGrade, setMintGrade] = useState("B");
  const [mintBetType, setMintBetType] = useState("moneyline");
  const [mintOdds, setMintOdds] = useState("-110");
  const [mintConf, setMintConf] = useState("65");
  const [mintEv, setMintEv] = useState("10");
  const [mintGame, setMintGame] = useState("");
  const [mintMaxCopies, setMintMaxCopies] = useState("10");
  const [mintCardType, setMintCardType] = useState("admin_seeded");

  // Audit log state
  const [auditPage, setAuditPage] = useState(1);

  // Queries
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/cards/admin/analytics"],
  });
  const { data: registry, isLoading: registryLoading, refetch: refetchRegistry } = useQuery<RegistryCard[]>({
    queryKey: ["/api/cards/admin/registry"],
  });
  const { data: security, isLoading: securityLoading, refetch: refetchSecurity } = useQuery<SecurityStats>({
    queryKey: ["/api/cards/admin/security/stats"],
  });
  const { data: communityCards, isLoading: communityLoading, refetch: refetchCommunity } = useQuery<CommunityCard[]>({
    queryKey: ["/api/cards/admin/community-showcase"],
  });
  const { data: auditData, isLoading: auditLoading } = useQuery<{ rows: AuditLogRow[]; total: number; page: number }>({
    queryKey: ["/api/cards/admin/audit-log", auditPage],
    queryFn: () => fetch(`/api/cards/admin/audit-log?page=${auditPage}&limit=25`, { credentials: "include" }).then(r => r.json()),
  });

  // Mutations
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards/admin/seed", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Seeded ${data.seeded} showcase cards` });
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/analytics"] });
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/registry"] });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const freezeMutation = useMutation({
    mutationFn: async ({ cardId, reason }: { cardId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/cards/admin/${cardId}/freeze`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Card frozen" });
      refetchRegistry();
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/audit-log"] });
    },
    onError: () => toast({ title: "Failed to freeze", variant: "destructive" }),
  });

  const unfreezeMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest("POST", `/api/cards/admin/${cardId}/unfreeze`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Card unfrozen" });
      refetchRegistry();
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/audit-log"] });
    },
    onError: () => toast({ title: "Failed to unfreeze", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ collId, reason }: { collId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/cards/admin/collection/${collId}/revoke`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Card copy revoked" });
      refetchRegistry();
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/audit-log"] });
    },
    onError: () => toast({ title: "Failed to revoke", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (collId: number) => {
      const res = await apiRequest("POST", `/api/cards/admin/collection/${collId}/restore`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Card copy restored" });
      refetchRegistry();
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/audit-log"] });
    },
    onError: () => toast({ title: "Failed to restore", variant: "destructive" }),
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards/admin/manual-mint", {
        username: mintUsername, sport: mintSport, pick: mintPick, grade: mintGrade,
        betType: mintBetType, odds: Number(mintOdds), confidence: Number(mintConf),
        ev: Number(mintEv), game: mintGame, maxCopies: Number(mintMaxCopies), cardType: mintCardType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Card issued to ${data.issuedTo}` });
      setMintUsername(""); setMintPick(""); setMintGame("");
      refetchRegistry();
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/analytics"] });
      qc.invalidateQueries({ queryKey: ["/api/cards/admin/audit-log"] });
    },
    onError: (e: any) => toast({ title: "Mint failed", description: e.message, variant: "destructive" }),
  });

  const hideMutation = useMutation({
    mutationFn: async (collId: number) => {
      const res = await apiRequest("POST", `/api/cards/admin/community/${collId}/hide`, {});
      return res.json();
    },
    onSuccess: () => { toast({ title: "Hidden from community" }); refetchCommunity(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const featureMutation = useMutation({
    mutationFn: async (collId: number) => {
      const res = await apiRequest("POST", `/api/cards/admin/community/${collId}/feature`, {});
      return res.json();
    },
    onSuccess: () => { toast({ title: "Feature status updated" }); refetchCommunity(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  // Filtered registry
  const filteredRegistry = (registry || []).filter((c) => {
    if (regFilterType !== "all" && (c.cardType || "member") !== regFilterType) return false;
    if (regFilterGrade !== "all" && c.grade !== regFilterGrade) return false;
    if (regFilterStatus !== "all") {
      if (regFilterStatus === "frozen" && !c.isFrozen) return false;
      if (regFilterStatus === "active" && c.isFrozen) return false;
    }
    if (regSearch) {
      const q = regSearch.toLowerCase();
      if (!c.pick.toLowerCase().includes(q) && !c.game.toLowerCase().includes(q) && !c.sport.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const allGrades = [...new Set((registry || []).map((c) => c.grade))].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));

  const t = analytics?.totals;
  const ct = analytics?.collTotals;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Sors Cards Vault
            <Badge variant="outline" className="text-xs ml-1 border-amber-400/30 text-amber-400 bg-amber-400/5">Admin</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full visibility and control over every Intelligence Card on the platform.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => { refetchRegistry(); refetchAnalytics(); refetchSecurity(); refetchCommunity(); }} data-testid="button-refresh-vault">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh All
          </Button>
          <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
            className="bg-amber-500 text-black font-semibold" data-testid="button-seed-cards">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {seedMutation.isPending ? "Seeding…" : "Seed Demo Cards"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="overview" data-testid="tab-overview"><BarChart2 className="w-3.5 h-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="registry" data-testid="tab-registry"><Layers className="w-3.5 h-3.5 mr-1.5" />Card Registry</TabsTrigger>
          <TabsTrigger value="mint" data-testid="tab-mint"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />Mint Control</TabsTrigger>
          <TabsTrigger value="community" data-testid="tab-community"><Users className="w-3.5 h-3.5 mr-1.5" />Community</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security"><Shield className="w-3.5 h-3.5 mr-1.5" />Security</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit"><FileText className="w-3.5 h-3.5 mr-1.5" />Audit Log</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-5 mt-0">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : (
            <>
              {/* Primary stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Layers className="w-5 h-5 text-amber-400" />} label="Total Cards" value={t?.total_cards ?? 0} />
                <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Copies" value={ct?.total_copies ?? 0} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Won" value={t?.won_cards ?? 0} sub={t?.total_cards ? `${Math.round((t.won_cards / (t.total_cards)) * 100)}% win rate` : undefined} />
                <StatCard icon={<Clock className="w-5 h-5 text-amber-300" />} label="Pending" value={t?.pending_cards ?? 0} />
              </div>

              {/* Card type breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Settings2 className="w-5 h-5 text-amber-400" />} label="System Cards" value={t?.system_cards ?? 0} highlight="amber" />
                <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Member Cards" value={t?.member_cards ?? 0} highlight="blue" />
                <StatCard icon={<Star className="w-5 h-5 text-slate-400" />} label="Demo Cards" value={t?.admin_seeded_cards ?? 0} />
                <StatCard icon={<Zap className="w-5 h-5 text-purple-400" />} label="Pack Opens" value={ct?.pack_opens ?? 0} highlight="purple" />
              </div>

              {/* Security quick-stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Lock className="w-5 h-5 text-blue-400" />} label="Frozen Cards" value={t?.frozen_cards ?? 0} />
                <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Revoked Copies" value={ct?.revoked_copies ?? 0} />
                <StatCard icon={<Eye className="w-5 h-5 text-emerald-400" />} label="Showcased" value={ct?.showcased_copies ?? 0} />
                <StatCard icon={<Flame className="w-5 h-5 text-amber-400" />} label="Featured" value={ct?.featured_copies ?? 0} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Grade distribution */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" />By Grade</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {(analytics?.gradeDistrib || []).map(({ grade, count }) => (
                        <Badge key={grade} variant="outline" className={`text-xs border ${GRADE_COLOR[grade] || ""}`}>
                          {grade} <span className="ml-1 font-bold">{count}</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Sport distribution */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-primary" />By Sport</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {(analytics?.sportDistrib || []).map(({ sport, count }) => (
                        <Badge key={sport} variant="outline" className="text-xs">{sport} <span className="ml-1 font-bold">{count}</span></Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent activity */}
              {(analytics?.recentActivity || []).length > 0 && (
                <Card className="border border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary" />Recent Admin Activity</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {(analytics?.recentActivity || []).map(({ log, username }) => (
                      <div key={log.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <ActionBadge action={log.actionType} />
                          <span className="text-muted-foreground">{log.cardId || `coll#${log.collectionId}`}</span>
                          {log.reason && <span className="text-muted-foreground/60 truncate max-w-[200px]">{log.reason}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {username && <span className="text-muted-foreground">{username}</span>}
                          <span className="text-muted-foreground/60">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── CARD REGISTRY ─────────────────────────────────────────────── */}
        <TabsContent value="registry" className="space-y-4 mt-0">
          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search pick, game, ID…" value={regSearch} onChange={(e) => setRegSearch(e.target.value)} className="pl-8 h-9 text-sm" data-testid="input-search-registry" />
            </div>
            <Select value={regFilterType} onValueChange={setRegFilterType}>
              <SelectTrigger className="w-32 h-9 text-sm" data-testid="select-filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin_seeded">Demo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regFilterGrade} onValueChange={setRegFilterGrade}>
              <SelectTrigger className="w-28 h-9 text-sm" data-testid="select-filter-grade">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {allGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={regFilterStatus} onValueChange={setRegFilterStatus}>
              <SelectTrigger className="w-28 h-9 text-sm" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>
            {(regSearch || regFilterType !== "all" || regFilterGrade !== "all" || regFilterStatus !== "all") && (
              <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setRegSearch(""); setRegFilterType("all"); setRegFilterGrade("all"); setRegFilterStatus("all"); }}>Clear</Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filteredRegistry.length} cards</span>
          </div>

          {registryLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>}

          <div className="space-y-2">
            {filteredRegistry.map((card) => (
              <div key={card.id} className="border border-border/50 rounded-xl overflow-hidden" data-testid={`registry-row-${card.id}`}>
                {/* Card row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className={`text-[10px] border shrink-0 ${GRADE_COLOR[card.grade] || ""}`}>{card.grade}</Badge>
                    <Badge variant="outline" className={`text-[10px] border shrink-0 ${TYPE_STYLE[card.cardType || "member"] || ""}`}>{TYPE_LABEL[card.cardType || "member"] || card.cardType}</Badge>
                    <span className="text-sm font-medium truncate">{card.pick}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{card.sport}</span>
                    <span className="text-xs text-muted-foreground">{card.copiesIssued}/{card.maxCopies}</span>
                    {card.isFrozen ? (
                      <Badge className="text-[10px] h-5 px-1.5 bg-blue-500/15 text-blue-400 border border-blue-400/30 shrink-0"><Lock className="w-2.5 h-2.5 mr-0.5" />FROZEN</Badge>
                    ) : (
                      <Badge className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 shrink-0">ACTIVE</Badge>
                    )}
                    <ResultBadge result={card.settledResult} />
                    <span className="text-muted-foreground text-[10px]">{expandedCard === card.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded section */}
                {expandedCard === card.id && (
                  <div className="border-t border-border/40 bg-muted/10 px-4 py-4 space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {/* Card preview */}
                      <div className="w-36 shrink-0">
                        <TradingCard card={{ ...card, isFrozen: card.isFrozen ?? false }} instanceNumber={1} isFlippable />
                      </div>

                      {/* Card details + actions */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-[10px]">{card.id}</span></div>
                          <div><span className="text-muted-foreground">Odds:</span> {card.odds > 0 ? "+" : ""}{card.odds}</div>
                          <div><span className="text-muted-foreground">EV:</span> +{card.ev.toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Confidence:</span> {card.confidence}%</div>
                          <div><span className="text-muted-foreground">Game:</span> <span className="truncate">{card.game}</span></div>
                          <div><span className="text-muted-foreground">Created:</span> {formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}</div>
                        </div>

                        {/* Freeze/Unfreeze actions */}
                        <div className="flex flex-wrap gap-2 items-end">
                          {card.isFrozen ? (
                            <Button size="sm" variant="outline" className="h-8 text-xs border-blue-400/30 text-blue-400"
                              onClick={() => unfreezeMutation.mutate(card.id)} disabled={unfreezeMutation.isPending}
                              data-testid={`button-unfreeze-${card.id}`}>
                              <Unlock className="w-3 h-3 mr-1" />Unfreeze Card
                            </Button>
                          ) : (
                            <div className="flex items-end gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground mb-1 block">Freeze reason</Label>
                                <Input placeholder="Reason…" value={freezeReason} onChange={e => setFreezeReason(e.target.value)} className="h-8 text-xs w-40" data-testid={`input-freeze-reason-${card.id}`} />
                              </div>
                              <Button size="sm" variant="outline" className="h-8 text-xs border-blue-400/30 text-blue-400"
                                onClick={() => { freezeMutation.mutate({ cardId: card.id, reason: freezeReason }); setFreezeReason(""); }}
                                disabled={freezeMutation.isPending} data-testid={`button-freeze-${card.id}`}>
                                <Lock className="w-3 h-3 mr-1" />Freeze Card
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Owners list */}
                        {card.owners.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Owners ({card.owners.length})</p>
                            <div className="space-y-1">
                              {card.owners.map((owner) => (
                                <div key={owner.id} className="flex items-center justify-between text-xs border border-border/30 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{owner.username}</span>
                                    <span className="text-muted-foreground">#{String(owner.instanceNumber).padStart(3, "0")}</span>
                                    <span className="text-muted-foreground">via {owner.acquiredVia}</span>
                                    {owner.isPublicShowcase && <Badge className="text-[9px] h-4 px-1 bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">showcased</Badge>}
                                    {owner.isFeatured && <Badge className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-400 border border-amber-400/20">★ featured</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {owner.isRevoked ? (
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 px-2"
                                        onClick={() => restoreMutation.mutate(owner.id)} disabled={restoreMutation.isPending}
                                        data-testid={`button-restore-${owner.id}`}>
                                        <RotateCcw className="w-2.5 h-2.5 mr-0.5" />Restore
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {targetCollId === owner.id ? (
                                          <>
                                            <Input placeholder="Reason…" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} className="h-6 text-[10px] w-28 px-2" />
                                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 px-2"
                                              onClick={() => { revokeMutation.mutate({ collId: owner.id, reason: revokeReason }); setTargetCollId(null); setRevokeReason(""); }}
                                              disabled={revokeMutation.isPending} data-testid={`button-revoke-confirm-${owner.id}`}>Revoke</Button>
                                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={() => setTargetCollId(null)}>✕</Button>
                                          </>
                                        ) : (
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 px-2"
                                            onClick={() => setTargetCollId(owner.id)} data-testid={`button-revoke-${owner.id}`}>
                                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Revoke
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!registryLoading && filteredRegistry.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {(registry || []).length === 0 ? "No cards minted yet." : "No cards match filters."}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── MINT CONTROL ──────────────────────────────────────────────── */}
        <TabsContent value="mint" className="space-y-5 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-amber-400" />Issue Card to User
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Username *</Label>
                    <Input value={mintUsername} onChange={e => setMintUsername(e.target.value)} placeholder="exact username" className="h-8 text-sm mt-1" data-testid="input-mint-username" />
                  </div>
                  <div>
                    <Label className="text-xs">Sport *</Label>
                    <Select value={mintSport} onValueChange={setMintSport}>
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="select-mint-sport"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["NBA","NFL","NHL","MLB","NCAAB","NCAAF","MMA","SOCCER"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Grade *</Label>
                    <Select value={mintGrade} onValueChange={setMintGrade}>
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="select-mint-grade"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GRADE_ORDER.slice(0, -1).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Pick *</Label>
                    <Input value={mintPick} onChange={e => setMintPick(e.target.value)} placeholder="e.g. LeBron James Over 28.5 Points" className="h-8 text-sm mt-1" data-testid="input-mint-pick" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Game *</Label>
                    <Input value={mintGame} onChange={e => setMintGame(e.target.value)} placeholder="e.g. Lakers vs Celtics" className="h-8 text-sm mt-1" data-testid="input-mint-game" />
                  </div>
                  <div>
                    <Label className="text-xs">Bet Type</Label>
                    <Select value={mintBetType} onValueChange={setMintBetType}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["moneyline","spread","total","player_points","player_assists","player_rebounds"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Card Type</Label>
                    <Select value={mintCardType} onValueChange={setMintCardType}>
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="select-mint-card-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_seeded">Demo (admin_seeded)</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Odds</Label>
                    <Input value={mintOdds} onChange={e => setMintOdds(e.target.value)} placeholder="-110" className="h-8 text-sm mt-1" data-testid="input-mint-odds" />
                  </div>
                  <div>
                    <Label className="text-xs">Confidence %</Label>
                    <Input value={mintConf} onChange={e => setMintConf(e.target.value)} placeholder="65" className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">EV %</Label>
                    <Input value={mintEv} onChange={e => setMintEv(e.target.value)} placeholder="10" className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Max Copies</Label>
                    <Input value={mintMaxCopies} onChange={e => setMintMaxCopies(e.target.value)} placeholder="10" className="h-8 text-sm mt-1" />
                  </div>
                </div>
                <Button
                  className="w-full bg-amber-500 text-black font-semibold"
                  onClick={() => mintMutation.mutate()}
                  disabled={mintMutation.isPending || !mintUsername || !mintPick || !mintGame}
                  data-testid="button-issue-card"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {mintMutation.isPending ? "Issuing…" : "Issue Card"}
                </Button>
              </CardContent>
            </Card>

            {/* Live preview */}
            {(mintPick && mintSport) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Card Preview</p>
                <div className="w-52 mx-auto md:mx-0">
                  <TradingCard
                    card={{
                      id: "preview",
                      sport: mintSport,
                      pick: mintPick || "Your pick here",
                      grade: mintGrade,
                      betType: mintBetType,
                      odds: Number(mintOdds) || -110,
                      confidence: Number(mintConf) || 65,
                      ev: Number(mintEv) || 10,
                      game: mintGame || "Team A vs Team B",
                      gameTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
                      maxCopies: Number(mintMaxCopies) || 10,
                      copiesIssued: 1,
                      settledResult: null,
                      cardType: mintCardType,
                    }}
                    instanceNumber={1}
                    isFlippable
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── COMMUNITY MODERATION ──────────────────────────────────────── */}
        <TabsContent value="community" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Community Showcase</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All publicly shared member cards — hide, feature, or remove.</p>
            </div>
            <Badge variant="outline" className="text-xs">{(communityCards || []).length} cards</Badge>
          </div>

          {communityLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />)}</div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(communityCards || []).map((item) => (
              <div key={item.collection.id} className="space-y-2" data-testid={`community-card-${item.collection.id}`}>
                <TradingCard
                  card={item.card}
                  instanceNumber={item.collection.instanceNumber}
                  isFeatured={item.collection.isFeatured ?? false}
                  isFlippable
                />
                <div className="space-y-1 px-1">
                  <div className="text-xs text-muted-foreground truncate">@{item.username}</div>
                  {item.collection.isFeatured && <Badge className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-400 border border-amber-400/20">★ Featured</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1"
                    onClick={() => featureMutation.mutate(item.collection.id)}
                    disabled={featureMutation.isPending}
                    data-testid={`button-feature-${item.collection.id}`}>
                    <Star className="w-2.5 h-2.5 mr-0.5" />{item.collection.isFeatured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 text-red-400 border-red-400/30"
                    onClick={() => hideMutation.mutate(item.collection.id)}
                    disabled={hideMutation.isPending}
                    data-testid={`button-hide-${item.collection.id}`}>
                    <EyeOff className="w-2.5 h-2.5 mr-0.5" />Hide
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!communityLoading && (communityCards || []).length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">No publicly showcased cards yet.</div>
          )}
        </TabsContent>

        {/* ─── SECURITY CENTER ───────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-5 mt-0">
          {securityLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : (
            <>
              {/* Verification stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Verified Today" value={security?.verifyToday?.total ?? 0} />
                <StatCard icon={<Shield className="w-5 h-5 text-emerald-400" />} label="Authentic" value={security?.verifyToday?.authentic ?? 0} highlight="green" />
                <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Tampered" value={security?.verifyToday?.tampered ?? 0} />
                <StatCard icon={<XCircle className="w-5 h-5 text-orange-400" />} label="Not Found" value={security?.verifyToday?.not_found ?? 0} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                <StatCard icon={<Lock className="w-5 h-5 text-blue-400" />} label="Cards Frozen" value={security?.frozenCards ?? 0} />
                <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Copies Revoked" value={security?.revokedCopies ?? 0} />
              </div>

              {/* Top IPs */}
              {(security?.topIps || []).length > 0 && (
                <Card className="border border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Eye className="w-4 h-4 text-blue-400" />Top Verification IPs (24h)</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {(security?.topIps || []).map((ip, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-muted-foreground">{ip.ip_address}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-primary/20" style={{ width: 80 }}>
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (ip.verifications / (security?.topIps[0]?.verifications || 1)) * 100)}%` }} />
                            </div>
                            <span className="font-bold w-8 text-right">{ip.verifications}</span>
                            {ip.verifications > 20 && <Badge className="text-[9px] h-4 px-1 bg-red-500/15 text-red-400 border border-red-400/30">HIGH</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fraud Alerts */}
              {(security?.fraudAlerts || []).length > 0 && (
                <Card className="border border-red-400/20">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-400" />Fraud Alerts
                      <Badge className="ml-1 text-[10px] bg-red-500/15 text-red-400 border border-red-400/30">{(security?.fraudAlerts || []).filter(a => !a.reviewed).length} active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {(security?.fraudAlerts || []).map((alert) => (
                      <div key={alert.id} className={`border rounded-lg px-3 py-2 text-xs space-y-1 ${alert.reviewed ? "border-border/30 opacity-50" : "border-red-400/30 bg-red-500/5"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] h-4 px-1 border ${alert.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-400/40" : alert.severity === "high" ? "bg-orange-500/20 text-orange-400 border-orange-400/40" : "bg-yellow-500/10 text-yellow-400 border-yellow-400/30"}`}>{alert.severity.toUpperCase()}</Badge>
                            <span className="font-medium">{alert.alert_type.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {alert.reviewed && <span className="text-emerald-400 text-[9px]">✓ reviewed</span>}
                            <span className="text-muted-foreground">{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {alert.username && <div className="text-muted-foreground">User: <span className="font-medium text-foreground">{alert.username}</span></div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {(security?.topIps || []).length === 0 && (security?.fraudAlerts || []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Shield className="w-8 h-8 mx-auto mb-3 text-emerald-400/50" />
                  No security alerts. System is clean.
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── AUDIT LOG ─────────────────────────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Admin Action Log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Every admin action on cards — freeze, revoke, mint, and more.</p>
            </div>
            {auditData && <span className="text-xs text-muted-foreground">{auditData.total} total entries</span>}
          </div>

          {auditLoading && <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>}

          <div className="space-y-1.5">
            {(auditData?.rows || []).map(({ log, username }) => (
              <div key={log.id} className="flex items-center justify-between text-xs border border-border/30 rounded-lg px-3 py-2.5 bg-card/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ActionBadge action={log.actionType} />
                  <div className="min-w-0">
                    <span className="font-mono text-muted-foreground text-[10px]">{log.cardId || `coll#${log.collectionId}`}</span>
                    {log.reason && <span className="ml-2 text-muted-foreground/70 truncate">{log.reason}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log.targetUserId && <span className="text-muted-foreground">uid:{log.targetUserId}</span>}
                  {username && <span className="text-primary/70 font-medium">by {username}</span>}
                  <span className="text-muted-foreground/60">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>

          {!auditLoading && (auditData?.rows || []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No admin actions recorded yet.
            </div>
          )}

          {/* Pagination */}
          {auditData && auditData.total > 25 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={auditPage === 1} onClick={() => setAuditPage(p => Math.max(1, p - 1))} data-testid="button-audit-prev">← Prev</Button>
              <span className="text-xs text-muted-foreground">Page {auditPage} / {Math.ceil(auditData.total / 25)}</span>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={auditPage >= Math.ceil(auditData.total / 25)} onClick={() => setAuditPage(p => p + 1)} data-testid="button-audit-next">Next →</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: number; sub?: string; highlight?: string }) {
  const border = highlight === "amber" ? "border-amber-400/20" : highlight === "blue" ? "border-blue-400/20" : highlight === "green" ? "border-emerald-400/20" : highlight === "purple" ? "border-purple-400/20" : "border-border/50";
  return (
    <Card className={`border ${border}`}>
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

const ACTION_STYLE: Record<string, string> = {
  freeze: "bg-blue-500/15 text-blue-400 border-blue-400/30",
  unfreeze: "bg-sky-500/15 text-sky-400 border-sky-400/30",
  revoke: "bg-red-500/15 text-red-400 border-red-400/30",
  restore: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  manual_mint: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  community_hide: "bg-orange-500/15 text-orange-400 border-orange-400/30",
  community_feature: "bg-purple-500/15 text-purple-400 border-purple-400/30",
  community_unfeature: "bg-slate-500/15 text-slate-400 border-slate-400/30",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_STYLE[action] || "bg-muted text-muted-foreground border-border/40";
  return (
    <Badge className={`text-[9px] h-4 px-1.5 border shrink-0 ${cls}`}>
      {action.replace(/_/g, " ").toUpperCase()}
    </Badge>
  );
}
