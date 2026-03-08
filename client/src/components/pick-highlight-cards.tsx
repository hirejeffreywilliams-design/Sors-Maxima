import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, CheckCircle2, XCircle, Sparkles, Target, Zap,
  ChevronLeft, ChevronRight, Brain, TrendingUp
} from "lucide-react";
import { useRef, useState } from "react";
import { gradeAmbientGlow, getGradeShimmerClass } from "@/lib/grade-utils";

interface HighlightPick {
  id: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  ev: number;
  result: "won" | "lost";
  homeScore?: number;
  awayScore?: number;
  gameTime: string;
  intelligenceNotes: string[];
}

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾",
  NCAAB: "🏀", MMA: "🥊", SOCCER: "⚽",
};

const GRADE_BG: Record<string, string> = {
  "A+": "from-amber-500/20 to-yellow-500/10",
  A: "from-amber-500/15 to-yellow-500/8",
  "A-": "from-amber-400/12 to-yellow-400/6",
  "B+": "from-sky-500/15 to-blue-500/8",
  B: "from-sky-400/12 to-blue-400/6",
  "B-": "from-blue-400/10 to-blue-400/5",
};

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function GradeStars({ grade }: { grade: string }) {
  const stars = grade.startsWith("A") ? 5 : grade.startsWith("B+") ? 4 : 3;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < stars ? "bg-amber-400" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function PickCard({ pick }: { pick: HighlightPick }) {
  const isWin = pick.result === "won";
  const gradeBg = GRADE_BG[pick.grade] ?? "from-muted/20 to-muted/5";

  return (
    <div
      className={`shrink-0 w-[300px] sm:w-[340px] rounded-2xl border-2 overflow-hidden select-none ${
        isWin ? "border-emerald-500/50" : "border-red-500/40"
      } bg-gradient-to-br from-card to-background ${getGradeShimmerClass(pick.grade)}`}
      style={{
        ...gradeAmbientGlow(pick.grade),
        boxShadow: isWin
          ? `${gradeAmbientGlow(pick.grade).boxShadow}, 0 0 45px rgba(34,197,94,0.35), 0 0 90px rgba(34,197,94,0.12), 0 4px 24px rgba(0,0,0,0.5)`
          : `${gradeAmbientGlow(pick.grade).boxShadow}, 0 0 35px rgba(239,68,68,0.28), 0 0 70px rgba(239,68,68,0.08), 0 4px 24px rgba(0,0,0,0.5)`,
      }}
      data-testid={`pick-card-${pick.id}`}
    >
      {/* Top glow strip */}
      <div className={`h-1.5 w-full ${isWin ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600" : "bg-gradient-to-r from-red-500 via-red-400 to-red-600"}`} />

      {/* Header */}
      <div className={`px-4 pt-3 pb-2 bg-gradient-to-r ${gradeBg} border-b ${isWin ? "border-emerald-500/15" : "border-red-500/15"}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{SPORT_EMOJI[pick.sport] || "🎯"}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">{pick.sport}</Badge>
            <Badge
              className={`text-[10px] px-1.5 py-0 font-black ${
                pick.grade.startsWith("A") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-sky-500/20 text-sky-400 border-sky-500/30"
              }`}
            >
              {pick.grade}
            </Badge>
          </div>
          {isWin ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 tracking-wider">CALLED IT</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] font-black text-red-400 tracking-wider">MISSED</span>
            </div>
          )}
        </div>
        <GradeStars grade={pick.grade} />
      </div>

      {/* Matchup & Pick */}
      <div className="px-4 py-3 border-b border-border/40">
        <p className="text-[10px] text-muted-foreground mb-0.5 truncate">{pick.game}</p>
        <p className="text-base font-black leading-tight mb-1">{pick.pick}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${pick.odds > 0 ? "text-emerald-400" : "text-foreground"}`}>
            {formatOdds(pick.odds)}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground capitalize">{pick.betType.replace("_", " ")}</span>
          {pick.homeScore !== undefined && pick.awayScore !== undefined && (
            <>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs font-mono text-foreground/70">
                {pick.awayScore}–{pick.homeScore}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Confidence + EV meters */}
      <div className="px-4 py-2.5 grid grid-cols-2 gap-3 border-b border-border/40">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Confidence</span>
            <span className="text-[10px] font-bold text-foreground">{pick.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${pick.confidence >= 70 ? "bg-emerald-500" : pick.confidence >= 60 ? "bg-sky-500" : "bg-yellow-500"}`}
              style={{ width: `${pick.confidence}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Sors EV</span>
            <span className="text-[10px] font-bold text-emerald-400">+{Math.round(pick.ev)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(pick.ev / 10, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Intelligence notes */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80">Sors Intelligence Report</span>
        </div>
        {pick.intelligenceNotes.map((note, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-snug">{note}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 flex items-center justify-between ${isWin ? "bg-emerald-500/8" : "bg-red-500/8"}`}>
        <div className="flex items-center gap-1.5">
          <Trophy className={`w-3 h-3 ${isWin ? "text-emerald-400" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-semibold ${isWin ? "text-emerald-400" : "text-muted-foreground"}`}>
            {isWin ? "Win confirmed" : "Result: missed"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{formatDate(pick.gameTime)}</span>
      </div>
    </div>
  );
}

export function PickHighlightCards() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data, isLoading } = useQuery<{ picks: HighlightPick[]; stats: { wins: number; losses: number } }>({
    queryKey: ["/api/pick-highlights"],
    staleTime: 3 * 60 * 1000,
  });

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 360 : -360, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  const picks = data?.picks ?? [];

  return (
    <div className="space-y-3" data-testid="pick-highlight-cards">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Pick Hall of Fame</h3>
            <p className="text-[10px] text-muted-foreground">
              Real picks generated by Sors — before the game started
            </p>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
              {data.stats.wins} wins shown
            </Badge>
            <div className="flex gap-1">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                data-testid="button-scroll-highlights-left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                data-testid="button-scroll-highlights-right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ambient context line */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/15 bg-primary/5">
        <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-snug">
          Every card below was generated by the Sors 46-Factor Engine <strong className="text-foreground">before the game started</strong>. Green glow = Sors called it correctly. Scroll right to see more.
        </p>
      </div>

      {/* Scroll container */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="shrink-0 w-[300px] h-[340px] rounded-2xl" />
          ))}
        </div>
      ) : picks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Picks are settling — check back after a few games complete.</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ scrollSnapType: "x mandatory" }}
          data-testid="pick-highlights-scroll"
        >
          {picks.map(pick => (
            <div key={pick.id} style={{ scrollSnapAlign: "start" }}>
              <PickCard pick={pick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
