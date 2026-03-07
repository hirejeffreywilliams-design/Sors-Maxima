import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, TrendingUp, Globe, Clock, Target, Zap, Trophy, AlertCircle } from "lucide-react";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────
interface SoccerPick {
  id: string;
  sport: string;
  league: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  ev: number;
  gameTime?: string;
  reasoning: string;
  selectionCategory: "underdog" | "contrarian" | "alternative" | "sleeper";
  isLive: boolean;
  venue: string;
}

interface LeagueStatus {
  sport: string;
  league: string;
  active: boolean;
  gameCount: number;
  pickCount: number;
  lastUpdated: string;
}

interface InternationalFeed {
  picks: SoccerPick[];
  leagueStatus: LeagueStatus[];
  lastUpdated: string;
  totalGames: number;
  totalPicks: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LEAGUE_EMOJI: Record<string, string> = {
  Soccer_EPL: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Soccer_LALIGA: "🇪🇸",
  Soccer_BUNDESLIGA: "🇩🇪",
  Soccer_SERIEA: "🇮🇹",
  Soccer_LIGUE1: "🇫🇷",
  Soccer_UCL: "⭐",
  Soccer_MLS: "🇺🇸",
  Soccer_INTL: "🌍",
};

const LEAGUE_SHORT: Record<string, string> = {
  Soccer_EPL: "EPL",
  Soccer_LALIGA: "La Liga",
  Soccer_BUNDESLIGA: "Bundesliga",
  Soccer_SERIEA: "Serie A",
  Soccer_LIGUE1: "Ligue 1",
  Soccer_UCL: "UCL",
  Soccer_MLS: "MLS",
  Soccer_INTL: "Intl",
};

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds);
}

function formatGameTime(gameTime?: string): string {
  if (!gameTime) return "TBD";
  try {
    const d = new Date(gameTime);
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  } catch {
    return gameTime;
  }
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B+")) return "text-lime-400";
  if (grade.startsWith("B")) return "text-yellow-400";
  return "text-orange-400";
}

function categoryColor(cat: SoccerPick["selectionCategory"]): string {
  switch (cat) {
    case "sleeper": return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "underdog": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "contrarian": return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "alternative": return "bg-teal-500/20 text-teal-300 border-teal-500/40";
  }
}

function categoryLabel(cat: SoccerPick["selectionCategory"]): string {
  switch (cat) {
    case "sleeper": return "Sleeper";
    case "underdog": return "Underdog";
    case "contrarian": return "Contrarian";
    case "alternative": return "Alt Market";
  }
}

// ── PickCard ─────────────────────────────────────────────────────────────────
function PickCard({ pick, isInSlip, onAdd }: { pick: SoccerPick; isInSlip: boolean; onAdd: () => void }) {
  const inSlip = isInSlip;

  return (
    <Card
      className={`relative overflow-hidden border transition-all hover:border-primary/40 ${inSlip ? "border-primary/50 bg-primary/5" : "border-border/40 bg-card/60"}`}
      data-testid={`pick-card-${pick.id}`}
    >
      <CardContent className="p-4">
        {/* League badge + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{LEAGUE_EMOJI[pick.sport] || "⚽"}</span>
            <span className="text-xs font-medium text-muted-foreground">{pick.league}</span>
            {pick.isLive && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/40 animate-pulse">LIVE</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColor(pick.selectionCategory)}`}>
              {categoryLabel(pick.selectionCategory)}
            </Badge>
            <span className={`text-sm font-bold ${gradeColor(pick.grade)}`} data-testid={`grade-${pick.id}`}>{pick.grade}</span>
          </div>
        </div>

        {/* Match */}
        <div className="mb-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{pick.homeTeam} vs {pick.awayTeam}</p>
          {pick.gameTime && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatGameTime(pick.gameTime)}
            </p>
          )}
        </div>

        {/* Pick + Odds */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-primary" data-testid={`pick-label-${pick.id}`}>{pick.pick}</p>
            <p className="text-xs text-muted-foreground capitalize">{pick.betType.replace(/_/g, " ")}</p>
          </div>
          <div className="text-right">
            <span
              className={`text-xl font-bold tabular-nums ${pick.odds > 0 ? "text-emerald-400" : "text-foreground"}`}
              data-testid={`odds-${pick.id}`}
            >
              {formatOdds(pick.odds)}
            </span>
            <p className="text-[10px] text-muted-foreground">{pick.decimalOdds.toFixed(2)}x</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {pick.confidence}% confidence
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            EV: <span className={pick.ev >= 0 ? "text-emerald-400" : "text-red-400"}>{pick.ev >= 0 ? "+" : ""}{pick.ev.toFixed(1)}</span>
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed mb-3">{pick.reasoning}</p>

        {/* Add to slip */}
        <Button
          size="sm"
          variant={inSlip ? "secondary" : "default"}
          className="w-full h-8 text-xs font-semibold"
          onClick={onAdd}
          disabled={inSlip}
          data-testid={`btn-add-${pick.id}`}
        >
          {inSlip ? (
            <><Check className="h-3 w-3 mr-1.5" /> In Slip</>
          ) : (
            <><Plus className="h-3 w-3 mr-1.5" /> Add to Slip</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── League Summary Card ───────────────────────────────────────────────────────
function LeagueSummaryCard({ status, onClick, isActive }: { status: LeagueStatus; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:border-primary/50 cursor-pointer w-full ${
        isActive ? "border-primary bg-primary/10" : "border-border/40 bg-card/40 hover:bg-card/60"
      }`}
      data-testid={`league-card-${status.sport}`}
    >
      <span className="text-2xl">{LEAGUE_EMOJI[status.sport] || "⚽"}</span>
      <span className="text-xs font-semibold text-center leading-tight">{LEAGUE_SHORT[status.sport] || status.league}</span>
      {status.active ? (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          {status.gameCount} games
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/60">
          No games
        </Badge>
      )}
      {status.pickCount > 0 && (
        <span className="text-[10px] text-primary font-medium">{status.pickCount} picks</span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InternationalPage() {
  const [activeLeague, setActiveLeague] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"ev" | "odds" | "confidence">("ev");
  const { legs, addLeg } = useParlaySlip();
  const { toast } = useToast();

  const { data: feed, isLoading, error, refetch } = useQuery<InternationalFeed>({
    queryKey: ["/api/international/feed"],
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const slipIds = useMemo(() => new Set(legs.map((l: { id: string }) => l.id)), [legs]);

  const filteredPicks = useMemo(() => {
    if (!feed) return [];
    const picks = activeLeague === "all" ? feed.picks : feed.picks.filter(p => p.sport === activeLeague);
    return [...picks].sort((a, b) => {
      if (sortBy === "ev") return b.ev - a.ev;
      if (sortBy === "odds") return b.odds - a.odds;
      return b.confidence - a.confidence;
    });
  }, [feed, activeLeague, sortBy]);

  function handleAdd(pick: SoccerPick) {
    const decimalOdds = pick.odds > 0
      ? 1 + (pick.odds / 100)
      : 1 + (100 / Math.abs(pick.odds));

    const validMarket = ["moneyline", "spread", "total", "player_prop"].includes(pick.betType)
      ? pick.betType
      : pick.betType === "draw" ? "moneyline" : "moneyline";

    const ok = addLeg({
      id: pick.id,
      team: pick.homeTeam,
      opponent: pick.awayTeam,
      market: validMarket as any,
      outcome: pick.pick,
      decimalOdds,
      americanOdds: pick.odds,
      addedFrom: "International Sports",
      addedAt: new Date().toISOString(),
      sport: pick.sport,
      confidence: pick.confidence,
      evPercent: pick.ev,
      gameTime: pick.gameTime,
    } as any);
    if (ok) {
      toast({ title: "Added to slip", description: `${pick.pick} (${formatOdds(pick.odds)})` });
    }
  }

  const activePicks = filteredPicks.filter(p => !p.isLive);
  const livePicks = filteredPicks.filter(p => p.isLive);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-international">International Sports</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Soccer picks from 7 global leagues — draws and underdogs the US market ignores
            </p>
          </div>
          {feed && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last updated</p>
                <p className="text-xs font-medium">{formatGameTime(feed.lastUpdated)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="btn-refresh">
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* ── Daily Edge Parlay notice ─────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <Zap className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-amber-300">Daily Edge Parlay boost active.</span>
            <span className="text-muted-foreground ml-1.5">
              Soccer draws (+200 to +350) and underdog moneylines are automatically included in the daily Edge Parlay — 
              these markets are among the most underpriced by US sportsbooks.
            </span>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Failed to load international data</p>
                <p className="text-xs text-muted-foreground mt-0.5">The soccer API may be temporarily unavailable. Try refreshing.</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* ── Main content ─────────────────────────────────────────────── */}
        {feed && !isLoading && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border/40 bg-card/60">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{feed.totalGames}</p>
                  <p className="text-xs text-muted-foreground">Upcoming games</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/60">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{feed.totalPicks}</p>
                  <p className="text-xs text-muted-foreground">Edge picks found</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/60">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {feed.leagueStatus.filter(l => l.active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active leagues</p>
                </CardContent>
              </Card>
            </div>

            {/* League filter grid */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Filter by League</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                <button
                  onClick={() => setActiveLeague("all")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:border-primary/50 cursor-pointer ${
                    activeLeague === "all" ? "border-primary bg-primary/10" : "border-border/40 bg-card/40"
                  }`}
                  data-testid="league-filter-all"
                >
                  <span className="text-2xl">⚽</span>
                  <span className="text-xs font-semibold">All</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{feed.totalPicks}</Badge>
                </button>
                {feed.leagueStatus.map(status => (
                  <LeagueSummaryCard
                    key={status.sport}
                    status={status}
                    isActive={activeLeague === status.sport}
                    onClick={() => setActiveLeague(status.sport)}
                  />
                ))}
              </div>
            </div>

            {/* Sort controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredPicks.length} picks
                {activeLeague !== "all" && <span className="ml-1">in {feed.leagueStatus.find(l => l.sport === activeLeague)?.league}</span>}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Sort:</span>
                {(["ev", "odds", "confidence"] as const).map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={sortBy === s ? "default" : "ghost"}
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setSortBy(s)}
                    data-testid={`sort-${s}`}
                  >
                    {s === "ev" ? "EV" : s === "odds" ? "Odds" : "Conf."}
                  </Button>
                ))}
              </div>
            </div>

            {/* No picks state */}
            {filteredPicks.length === 0 && (
              <Card className="border-border/30 bg-card/30">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Globe className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium">No picks available for this league right now</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Picks are generated from upcoming fixtures. Try a different league or check back later.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveLeague("all")}>View all leagues</Button>
                </CardContent>
              </Card>
            )}

            {/* Live picks section */}
            {livePicks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-sm font-semibold text-red-400">In Progress</h2>
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">{livePicks.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {livePicks.map(pick => (
                    <PickCard
                      key={pick.id}
                      pick={pick}
                      isInSlip={slipIds.has(pick.id)}
                      onAdd={() => handleAdd(pick)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming picks */}
            {activePicks.length > 0 && (
              <div>
                {livePicks.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Upcoming</h2>
                    <Badge variant="outline" className="text-[10px]">{activePicks.length}</Badge>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePicks.map(pick => (
                    <PickCard
                      key={pick.id}
                      pick={pick}
                      isInSlip={slipIds.has(pick.id)}
                      onAdd={() => handleAdd(pick)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Why soccer section */}
            <Card className="border-border/30 bg-card/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Why soccer for parlays?
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-amber-300 mb-1">Draws are gold</p>
                  <p className="text-xs text-muted-foreground">~27% of matches end in a draw. Most US books price draws at +200 to +350 — that's systematic mispricing US bettors ignore.</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-300 mb-1">Away upsets</p>
                  <p className="text-xs text-muted-foreground">Books overweight home advantage in top European leagues. True away win probability is often 5–8% higher than market odds reflect.</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-300 mb-1">Parlay multiplication</p>
                  <p className="text-xs text-muted-foreground">One draw pick at +280 multiplied across a 6-leg parlay can push combined odds from +1,200 to +4,000 with the same US sports legs.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
