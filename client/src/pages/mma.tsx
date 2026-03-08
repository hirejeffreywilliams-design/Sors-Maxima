import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sword, Clock, TrendingUp, Target, Zap, Trophy,
  Check, Plus, AlertCircle, Shield, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { PickDisclaimer } from "@/components/pick-disclaimer";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MMAFight {
  id: string;
  fighter1: string;
  fighter2: string;
  pick: string;
  pickOdds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  ev: number;
  edge: number;
  impliedProbability: number;
  trueWinProbability: number;
  consensusStrength: number;
  bookmakerCount: number;
  gameTime: string;
  reasoning: string;
  selectionCategory: "favorite" | "underdog" | "close_call";
  fighter1Odds: number;
  fighter2Odds: number;
}

interface MMAFeed {
  fights: MMAFight[];
  lastUpdated: string;
  totalFights: number;
  nextEvent?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds);
}

function formatGameTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    if (isToday) return `Today ${time}`;
    if (isTomorrow) return `Tomorrow ${time}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` ${time}`;
  } catch { return iso; }
}

function groupByDay(fights: MMAFight[]): Record<string, MMAFight[]> {
  const groups: Record<string, MMAFight[]> = {};
  for (const fight of fights) {
    try {
      const d = new Date(fight.gameTime);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(fight);
    } catch {
      if (!groups["Upcoming"]) groups["Upcoming"] = [];
      groups["Upcoming"].push(fight);
    }
  }
  return groups;
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
  if (grade.startsWith("B")) return "bg-blue-500/15 border-blue-500/30 text-blue-400";
  if (grade.startsWith("C")) return "bg-amber-500/15 border-amber-500/30 text-amber-400";
  return "bg-red-500/15 border-red-500/30 text-red-400";
}

function confColor(conf: number): string {
  if (conf >= 80) return "text-emerald-400";
  if (conf >= 65) return "text-blue-400";
  if (conf >= 50) return "text-amber-400";
  return "text-red-400";
}

function categoryLabel(cat: MMAFight["selectionCategory"]): { text: string; color: string } {
  if (cat === "favorite") return { text: "Market Favorite", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
  if (cat === "underdog")  return { text: "Value Underdog",  color: "bg-purple-500/15 border-purple-500/30 text-purple-400" };
  return { text: "Close Fight", color: "bg-amber-500/15 border-amber-500/30 text-amber-400" };
}

// ── Fight Card ─────────────────────────────────────────────────────────────────
function FightCard({ fight, onAdd }: { fight: MMAFight; onAdd: (f: MMAFight) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { isInSlip } = useParlaySlip();
  const inSlip = isInSlip(fight.id);
  const cat = categoryLabel(fight.selectionCategory);

  return (
    <Card className="border border-border/50 hover:border-primary/30 transition-colors" data-testid={`card-fight-${fight.id}`}>
      <CardContent className="p-4 space-y-3">

        {/* Header: time + badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatGameTime(fight.gameTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] h-5 ${cat.color}`}>{cat.text}</Badge>
            <Badge variant="outline" className={`text-[10px] h-5 font-mono ${gradeColor(fight.grade)}`}>{fight.grade}</Badge>
            <Badge variant="outline" className="text-[10px] h-5 border-blue-500/30 text-blue-400 bg-blue-500/10">
              {fight.bookmakerCount} books
            </Badge>
          </div>
        </div>

        {/* Fighters vs. */}
        <div className="flex items-center gap-3">
          <div className={`flex-1 p-3 rounded-xl border transition-colors ${fight.pick === fight.fighter1 ? "border-primary/40 bg-primary/8" : "border-border/40 bg-muted/20"}`}>
            <p className={`font-semibold text-sm leading-tight ${fight.pick === fight.fighter1 ? "text-primary" : "text-foreground"}`}>
              {fight.fighter1}
            </p>
            <p className={`text-sm font-mono mt-1 ${fight.pick === fight.fighter1 ? "text-primary font-bold" : "text-muted-foreground"}`}>
              {formatOdds(fight.fighter1Odds)}
            </p>
            {fight.pick === fight.fighter1 && (
              <div className="flex items-center gap-1 mt-1">
                <Target className="w-2.5 h-2.5 text-primary" />
                <span className="text-[10px] text-primary font-medium">Pick</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <Sword className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-bold">VS</span>
          </div>

          <div className={`flex-1 p-3 rounded-xl border transition-colors ${fight.pick === fight.fighter2 ? "border-primary/40 bg-primary/8" : "border-border/40 bg-muted/20"}`}>
            <p className={`font-semibold text-sm leading-tight ${fight.pick === fight.fighter2 ? "text-primary" : "text-foreground"}`}>
              {fight.fighter2}
            </p>
            <p className={`text-sm font-mono mt-1 ${fight.pick === fight.fighter2 ? "text-primary font-bold" : "text-muted-foreground"}`}>
              {formatOdds(fight.fighter2Odds)}
            </p>
            {fight.pick === fight.fighter2 && (
              <div className="flex items-center gap-1 mt-1">
                <Target className="w-2.5 h-2.5 text-primary" />
                <span className="text-[10px] text-primary font-medium">Pick</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className={`text-sm font-bold ${confColor(fight.confidence)}`}>{fight.confidence}%</p>
            <p className="text-[9px] text-muted-foreground">Confidence</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className={`text-sm font-bold ${fight.ev >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fight.ev >= 0 ? "+" : ""}{fight.ev}%
            </p>
            <p className="text-[9px] text-muted-foreground">EV</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-sm font-bold text-foreground">{fight.trueWinProbability}%</p>
            <p className="text-[9px] text-muted-foreground">True Prob</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-sm font-bold text-blue-400">{fight.consensusStrength}%</p>
            <p className="text-[9px] text-muted-foreground">Consensus</p>
          </div>
        </div>

        {/* Reasoning (collapsible) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          data-testid={`button-expand-${fight.id}`}
        >
          <TrendingUp className="w-3 h-3 shrink-0" />
          <span className="flex-1">{expanded ? "Hide analysis" : "View analysis"}</span>
          {expanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
        </button>

        {expanded && (
          <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border/30 leading-relaxed">
            {fight.reasoning}
          </p>
        )}

        {/* Add to slip */}
        <Button
          size="sm"
          className={`w-full h-8 text-xs font-medium gap-1.5 transition-colors ${inSlip ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
          onClick={() => onAdd(fight)}
          disabled={inSlip}
          data-testid={`button-add-fight-${fight.id}`}
        >
          {inSlip ? <><Check className="w-3 h-3" /> Added to Slip</> : <><Plus className="w-3 h-3" /> Add {fight.pick} to Slip</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MMAPage() {
  useSEO({ title: "MMA / UFC Picks", description: "Market-consensus MMA and UFC fight picks with EV analysis" });
  const [filter, setFilter] = useState<"all" | "favorite" | "underdog" | "close_call">("all");
  const { addLeg } = useParlaySlip();
  const { toast } = useToast();

  const { data: feed, isLoading, isError, refetch, isFetching } = useQuery<MMAFeed>({
    queryKey: ["/api/mma/picks"],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const filteredFights = useMemo(() => {
    if (!feed?.fights) return [];
    if (filter === "all") return feed.fights;
    return feed.fights.filter(f => f.selectionCategory === filter);
  }, [feed?.fights, filter]);

  const dayGroups = useMemo(() => groupByDay(filteredFights), [filteredFights]);

  const handleAdd = (fight: MMAFight) => {
    const leg: ParlaySlipLeg = {
      id: fight.id,
      team: fight.pick,
      opponent: fight.pick === fight.fighter1 ? fight.fighter2 : fight.fighter1,
      market: "moneyline",
      outcome: fight.pick,
      odds: fight.pickOdds,
      decimalOdds: fight.decimalOdds,
      sport: "MMA",
    };
    addLeg(leg);
    toast({ title: "Added to Slip", description: `${fight.pick} (${formatOdds(fight.pickOdds)})` });
  };

  const stats = useMemo(() => {
    const fights = feed?.fights ?? [];
    const aGrades = fights.filter(f => f.grade.startsWith("A")).length;
    const avgConf = fights.length ? Math.round(fights.reduce((s, f) => s + f.confidence, 0) / fights.length) : 0;
    const posEV = fights.filter(f => f.ev > 0).length;
    return { total: fights.length, aGrades, avgConf, posEV };
  }, [feed?.fights]);

  return (
    <div className="min-h-full" data-testid="page-mma">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/8 via-background to-orange-500/5 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Sword className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-mma-title">
                  MMA / UFC Picks
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Market-consensus analysis · Vig-removed true probabilities · {stats.total} fights
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs self-start md:self-center"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-mma"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-red-400" data-testid="text-mma-total">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Fights Analyzed</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.aGrades}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Grade A Picks</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.avgConf}%</p>
              <p className="text-[10px] text-muted-foreground font-medium">Avg Confidence</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-purple-400">{stats.posEV}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Positive EV Picks</p>
            </div>
          </div>
        </div>

        <PickDisclaimer variant="banner" />

        {/* Filter tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/30 border border-border/40">
          {([["all", "All Fights"], ["favorite", "Favorites"], ["underdog", "Value Underdogs"], ["close_call", "Close Calls"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${filter === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-filter-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-3">
                  <Skeleton className="flex-1 h-16 rounded-xl" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="flex-1 h-16 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[1,2,3,4].map(j => <Skeleton key={j} className="h-10 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/25 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Could not load MMA picks</p>
              <p className="text-xs text-red-400/80 mt-0.5">Check your connection or try refreshing.</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filteredFights.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
              <Sword className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No fights scheduled</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {filter !== "all" ? "No fights match this filter. Try switching to All Fights." : "No upcoming MMA/UFC events with available odds right now. Check back closer to fight night."}
            </p>
            {filter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setFilter("all")}>Show All Fights</Button>
            )}
          </div>
        )}

        {/* Fight cards grouped by day */}
        {!isLoading && Object.entries(dayGroups).map(([day, fights]) => (
          <div key={day} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{day}</h2>
              </div>
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-xs text-muted-foreground">{fights.length} fight{fights.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {fights.map(fight => (
                <FightCard key={fight.id} fight={fight} onAdd={handleAdd} />
              ))}
            </div>
          </div>
        ))}

        {/* How it works */}
        {!isLoading && filteredFights.length > 0 && (
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How MMA Analysis Works</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each fight is analyzed using moneyline consensus across {feed?.fights[0]?.bookmakerCount ?? 3}+ major US sportsbooks. Implied probabilities are extracted per bookmaker, averaged, and vig is mathematically removed to calculate true win probabilities. Expected value (EV) measures the edge between the vig-free true probability and the actual implied odds you'd be betting at. Picks with strong consensus and positive EV are highest-rated.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
