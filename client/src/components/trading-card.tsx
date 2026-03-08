import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain, Trophy, CheckCircle2, XCircle, Sparkles, Share2, Copy, MessageSquare } from "lucide-react";
import { getGradeGlow } from "@/lib/grade-utils";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTier } from "@/components/tier-gate";

interface TradingCardProps {
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
    issuedAt?: string;
  };
  instanceNumber?: number;
  collectionId?: number;
  isPublicShowcase?: boolean;
  className?: string;
  showBack?: boolean;
  isFlippable?: boolean;
  onFlip?: () => void;
  isFlipped?: boolean;
}

function parseTeams(game: string): { home: string; away: string } {
  const m = game.match(/^(.+?)\s+(?:vs\.?|@|at)\s+(.+)$/i);
  if (m) return { home: m[1].trim(), away: m[2].trim() };
  return { home: game, away: "" };
}

const SPORT_ICONS: Record<string, string> = {
  NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾",
  NCAAB: "🏀", NCAAF: "🏈", MMA: "🥊", SOCCER: "⚽",
  UFC: "🥊", TENNIS: "🎾", GOLF: "⛳",
};

const SPORT_PATTERNS: Record<string, string> = {
  NBA: "repeating-linear-gradient(0deg,transparent,transparent 38px,rgba(255,255,255,0.025) 38px,rgba(255,255,255,0.025) 40px),repeating-linear-gradient(90deg,transparent,transparent 38px,rgba(255,255,255,0.025) 38px,rgba(255,255,255,0.025) 40px)",
  NHL: "repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(255,255,255,0.025) 18px,rgba(255,255,255,0.025) 20px)",
  NFL: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.025) 28px,rgba(255,255,255,0.025) 30px),linear-gradient(90deg,transparent 8%,rgba(255,255,255,0.015) 8%,rgba(255,255,255,0.015) 9%,transparent 9%,transparent 91%,rgba(255,255,255,0.015) 91%)",
  MLB: "repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(255,255,255,0.02) 18px,rgba(255,255,255,0.02) 20px),repeating-linear-gradient(-45deg,transparent,transparent 18px,rgba(255,255,255,0.02) 18px,rgba(255,255,255,0.02) 20px)",
  NCAAB: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 60%),repeating-linear-gradient(0deg,transparent,transparent 38px,rgba(255,255,255,0.025) 38px,rgba(255,255,255,0.025) 40px)",
  MMA: "repeating-linear-gradient(60deg,transparent,transparent 14px,rgba(255,255,255,0.02) 14px,rgba(255,255,255,0.02) 16px),repeating-linear-gradient(-60deg,transparent,transparent 14px,rgba(255,255,255,0.02) 14px,rgba(255,255,255,0.02) 16px)",
  SOCCER: "radial-gradient(circle at 50% 55%, rgba(255,255,255,0.03) 0%, transparent 40%), radial-gradient(circle at 50% 55%, transparent 39%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.02) 41%, transparent 42%)",
};

const GRADE_FOIL: Record<string, { bg: string; border: string; badge: string; accent: string; glow: string }> = {
  "A+": {
    bg: "from-amber-950/80 via-yellow-950/60 to-amber-950/80",
    border: "border-amber-400/70",
    badge: "bg-amber-400/20 text-amber-300 border-amber-400/60",
    accent: "#fbbf24",
    glow: "0 0 40px rgba(251,191,36,0.4), 0 0 80px rgba(251,191,36,0.15)",
  },
  "A": {
    bg: "from-emerald-950/80 via-green-950/60 to-emerald-950/80",
    border: "border-emerald-400/60",
    badge: "bg-emerald-400/20 text-emerald-300 border-emerald-400/50",
    accent: "#34d399",
    glow: "0 0 30px rgba(52,211,153,0.35), 0 0 60px rgba(52,211,153,0.12)",
  },
  "B+": {
    bg: "from-teal-950/80 via-cyan-950/60 to-teal-950/80",
    border: "border-teal-400/50",
    badge: "bg-teal-400/15 text-teal-300 border-teal-400/40",
    accent: "#2dd4bf",
    glow: "0 0 24px rgba(45,212,191,0.3), 0 0 48px rgba(45,212,191,0.1)",
  },
  "B": {
    bg: "from-blue-950/80 via-indigo-950/60 to-blue-950/80",
    border: "border-blue-400/45",
    badge: "bg-blue-400/15 text-blue-300 border-blue-400/40",
    accent: "#60a5fa",
    glow: "0 0 20px rgba(96,165,250,0.25), 0 0 40px rgba(96,165,250,0.08)",
  },
  "C+": {
    bg: "from-yellow-950/80 via-orange-950/60 to-yellow-950/80",
    border: "border-yellow-500/35",
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    accent: "#facc15",
    glow: "0 0 16px rgba(250,204,21,0.2)",
  },
  "C": {
    bg: "from-slate-900/80 via-zinc-900/60 to-slate-900/80",
    border: "border-slate-500/30",
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/25",
    accent: "#94a3b8",
    glow: "0 0 12px rgba(148,163,184,0.15)",
  },
  "D": {
    bg: "from-red-950/80 via-rose-950/60 to-red-950/80",
    border: "border-red-500/25",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    accent: "#f87171",
    glow: "0 0 10px rgba(248,113,113,0.12)",
  },
  "F": {
    bg: "from-gray-950/80 via-zinc-950/60 to-gray-950/80",
    border: "border-gray-600/20",
    badge: "bg-gray-600/10 text-gray-500 border-gray-600/15",
    accent: "#6b7280",
    glow: "",
  },
};

function getEventLabel(sport: string, gameTime: string): string | null {
  const d = new Date(gameTime);
  const month = d.getMonth() + 1;
  const sportUpper = sport.toUpperCase();

  if (sportUpper === "NCAAB") {
    if (month === 3 || month === 4) return "🏆 March Madness";
    return "🏀 College Hoops";
  }
  if (sportUpper === "NCAAF") {
    if (month === 12 || month === 1) return "🏈 Bowl Season";
    return "🏈 College Football";
  }
  if (sportUpper === "NFL") {
    if (month === 2) return "🏟️ Championship Weekend";
    if (month === 1) return "⚡ NFL Playoffs";
    return null;
  }
  if (sportUpper === "NBA") {
    if (month >= 4 && month <= 6) return "🏆 NBA Playoffs";
    return null;
  }
  if (sportUpper === "NHL") {
    if (month >= 4 && month <= 6) return "🏒 Stanley Cup Playoffs";
    return null;
  }
  if (sportUpper === "MLB") {
    if (month === 10) return "⚾ World Series";
    if (month === 9) return "⚾ Pennant Race";
    return null;
  }
  return null;
}

function getRarityLabel(grade: string): { label: string; color: string } {
  const g = grade.toUpperCase();
  if (g === "A+") return { label: "◆ LEGENDARY", color: "text-amber-400" };
  if (g === "A") return { label: "★ RARE", color: "text-emerald-400" };
  if (g === "B+") return { label: "✦ UNCOMMON", color: "text-teal-400" };
  if (g === "B") return { label: "• UNCOMMON", color: "text-blue-400" };
  return { label: "· COMMON", color: "text-muted-foreground" };
}

export function TradingCard({
  card,
  instanceNumber,
  className = "",
  isFlippable = false,
  onFlip,
  isFlipped: isFlippedProp,
  collectionId,
  isPublicShowcase,
}: TradingCardProps) {
  const { toast } = useToast();
  const { canAccess } = useTier();
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [isShowcaseToggling, setIsShowcaseToggling] = useState(false);
  const [copiedProof, setCopiedProof] = useState<"link" | "discord" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isFlipped = isFlippedProp ?? internalFlipped;

  const toggleShowcase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!collectionId || isShowcaseToggling) return;

    setIsShowcaseToggling(true);
    try {
      await apiRequest("POST", "/api/cards/showcase/toggle", { collectionId });
      await queryClient.invalidateQueries({ queryKey: ["/api/cards/collection"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/cards/community/feed"] });
      toast({
        title: isPublicShowcase ? "Removed from Community" : "Shared to Community",
        description: isPublicShowcase ? "This card is now private." : "Other members can now see this card!",
      });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message || "Failed to toggle showcase status",
        variant: "destructive",
      });
    } finally {
      setIsShowcaseToggling(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = x / rect.width;
    const ny = y / rect.height;
    setRotate({ x: -(ny - 0.5) * 12, y: (nx - 0.5) * 12 });
    setGlowPos({ x: nx * 100, y: ny * 100 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlowPos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const handleFlip = () => {
    if (!isFlippable) return;
    if (onFlip) onFlip();
    else setInternalFlipped(!internalFlipped);
  };

  const gradeKey = Object.keys(GRADE_FOIL).find(k =>
    card.grade.toUpperCase() === k || card.grade.toUpperCase().startsWith(k)
  ) || "F";
  const foil = GRADE_FOIL[gradeKey] || GRADE_FOIL["F"];
  const sportPattern = SPORT_PATTERNS[card.sport] || "";
  const sportIcon = SPORT_ICONS[card.sport] || "🎯";
  const eventLabel = getEventLabel(card.sport, card.gameTime);
  const rarity = getRarityLabel(card.grade);
  const isAPlus = card.grade === "A+";
  const isAPremium = card.grade.startsWith("A") || card.grade === "B+";
  const isSettled = !!card.settledResult;
  const isWin = card.settledResult === "won";

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative w-full h-full transition-all duration-500 ease-out cursor-pointer select-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleFlip}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
        transform: isFlipped
          ? "rotateY(180deg)"
          : isHovered
          ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02,1.02,1.02)`
          : "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      }}
      data-testid={`trading-card-${card.id}`}
    >
      {/* === FRONT === */}
      <div
        className="absolute inset-0"
        style={{ backfaceVisibility: "hidden" }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: isHovered && foil.glow ? foil.glow : "",
            transition: "box-shadow 0.3s ease",
          }}
        />

        {/* Card body */}
        <div
          className={`relative w-full h-full rounded-2xl border-2 overflow-hidden flex flex-col ${foil.border} bg-gradient-to-br ${foil.bg}`}
          style={{ backgroundImage: sportPattern ? `${sportPattern}` : undefined }}
        >
          {/* Background dot pattern (like real cards) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.035) 1px,transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* Holographic rainbow overlay — very prominent for A+/A */}
          {isAPlus && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(125deg, transparent 10%, rgba(255,0,128,0.18) 20%, rgba(255,165,0,0.18) 30%, rgba(255,255,0,0.15) 40%, rgba(0,255,128,0.18) 50%, rgba(0,200,255,0.18) 60%, rgba(128,0,255,0.18) 70%, transparent 80%)",
                  backgroundSize: "300% 300%",
                  animation: "holo-pulse 2.5s ease-in-out infinite",
                  mixBlendMode: "screen",
                  zIndex: 1,
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ zIndex: 2 }}
              >
                <div style={{
                  position: "absolute", width: "120px", height: "300%", top: "-100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 50%, transparent)",
                  animation: "holo-sweep 4s ease-in-out infinite",
                }} />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(251,191,36,0.35) 0%, transparent 55%)`,
                  transition: isHovered ? "background 0.06s" : "background 0.4s",
                  zIndex: 3,
                }}
              />
            </>
          )}
          {isAPremium && !isAPlus && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(125deg, transparent 15%, ${foil.accent}25 30%, rgba(255,255,255,0.10) 45%, ${foil.accent}20 60%, transparent 75%)`,
                  backgroundSize: "300% 300%",
                  animation: "holo-pulse 3.5s ease-in-out infinite",
                  mixBlendMode: "screen",
                  zIndex: 1,
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ zIndex: 2 }}
              >
                <div style={{
                  position: "absolute", width: "80px", height: "300%", top: "-100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.13) 50%, transparent)",
                  animation: "holo-sweep 6s ease-in-out infinite",
                }} />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${foil.accent}25 0%, transparent 55%)`,
                  transition: isHovered ? "background 0.06s" : "background 0.4s",
                  zIndex: 3,
                }}
              />
            </>
          )}

          {/* === Top rainbow bar === */}
          <div
            className="shrink-0"
            style={{
              height: "4px",
              background: isAPlus
                ? "linear-gradient(90deg,#ff0080,#ff8000,#ffff00,#00ff80,#00c8ff,#8000ff,#ff0080)"
                : `linear-gradient(90deg, ${foil.accent}, rgba(255,255,255,0.5), ${foil.accent})`,
              backgroundSize: "200% 100%",
              animation: isAPremium ? "holo-rainbow-bar 3s linear infinite" : undefined,
            }}
          />

          {/* === Header: Sport + Grade === */}
          <div className="relative z-10 px-4 py-2.5 flex items-center justify-between border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl drop-shadow-md">{sportIcon}</span>
              <div>
                <div className="text-[9px] font-black tracking-widest uppercase text-white/40">
                  {rarity.label}
                </div>
                <div className="text-xs font-black tracking-wider uppercase text-white/80">
                  {card.sport}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div
                className={`font-black text-2xl leading-none ${
                  isAPlus ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" :
                  card.grade.startsWith("A") ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" :
                  card.grade === "B+" ? "text-teal-400" :
                  card.grade.startsWith("B") ? "text-blue-400" :
                  "text-slate-400"
                }`}
              >
                {card.grade}
              </div>
              <div style={{ fontSize: "7px", fontWeight: 900, letterSpacing: "0.12em", color: foil.accent, opacity: 0.6 }}>SORS CERTIFIED</div>
              <div className="text-[8px] font-bold text-white/25 uppercase tracking-wider">Grade</div>
            </div>
          </div>

          {/* === Art Area — Matchup Showcase === */}
          {(() => {
            const teams = parseTeams(card.game);
            return (
              <div
                className="relative z-10 px-4 py-4 shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(to bottom, ${foil.accent}14 0%, ${foil.accent}06 60%, transparent 100%)`,
                  minHeight: "110px",
                }}
              >
                {/* Decorative watermark emoji */}
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[72px] leading-none"
                  style={{ opacity: 0.06, filter: isAPlus ? `drop-shadow(0 0 8px ${foil.accent})` : undefined }}
                  aria-hidden="true"
                >
                  {sportIcon}
                </div>

                {teams.away ? (
                  /* Two-team matchup layout */
                  <div className="relative z-10 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: `${foil.accent}70` }}>Home</p>
                        <p className="font-black text-[13px] leading-snug text-white/90 truncate">{teams.home}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-black tracking-widest text-white/25">VS</span>
                        <div className="w-5 h-px" style={{ background: `${foil.accent}50` }} />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: `${foil.accent}70` }}>Away</p>
                        <p className="font-black text-[13px] leading-snug text-white/90 truncate">{teams.away}</p>
                      </div>
                    </div>

                    {/* Power bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/25 shrink-0">Power</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${card.confidence}%`,
                            background: `linear-gradient(90deg, ${foil.accent}70, ${foil.accent})`,
                            boxShadow: `0 0 5px ${foil.accent}60`,
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-black shrink-0 tabular-nums"
                        style={{ color: foil.accent }}
                      >{card.confidence}</span>
                    </div>
                  </div>
                ) : (
                  /* Single-name / no-opponent fallback */
                  <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2">
                    <div
                      className="text-5xl drop-shadow-lg"
                      style={{
                        filter: isAPlus ? `drop-shadow(0 0 12px ${foil.accent})` : undefined,
                        animation: isAPlus ? "pulse 2s ease-in-out infinite" : undefined,
                      }}
                    >
                      {sportIcon}
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/25 shrink-0">Power</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full" style={{ width: `${card.confidence}%`, background: `linear-gradient(90deg, ${foil.accent}70, ${foil.accent})` }} />
                      </div>
                      <span className="text-[10px] font-black shrink-0" style={{ color: foil.accent }}>{card.confidence}</span>
                    </div>
                  </div>
                )}

                {eventLabel && (
                  <div
                    className="relative z-10 mt-2 inline-block text-[8px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border"
                    style={{
                      background: `${foil.accent}15`,
                      borderColor: `${foil.accent}40`,
                      color: foil.accent,
                      textShadow: `0 0 8px ${foil.accent}55`,
                    }}
                  >
                    {eventLabel}
                  </div>
                )}
              </div>
            );
          })()}

          {/* === Pick Info === */}
          <div className="relative z-10 flex-1 flex flex-col px-4 py-3 gap-2 min-h-0">
            {/* Watermark */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none -rotate-[30deg] font-black tracking-widest text-white whitespace-nowrap"
              style={{ fontSize: "11px", opacity: 0.035 }}
            >
              SORS MAXIMA™
            </div>
            <div>
              <p className="text-[9px] text-white/35 uppercase tracking-wider font-bold truncate">{card.game}</p>
              <h3 className="text-sm font-black leading-tight text-white/95 truncate">{card.pick}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-mono font-black"
                  style={{ color: foil.accent }}
                >
                  {card.odds > 0 ? `+${card.odds}` : card.odds}
                </span>
                <span className="text-[9px] text-white/40 uppercase">{card.betType.replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* Stats bars */}
            <div className="space-y-2.5 mt-auto">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase font-bold tracking-wider">Conviction</span>
                  <span className="text-[10px] font-black text-white/90">{card.confidence}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${card.confidence}%`,
                      background: `linear-gradient(90deg, ${foil.accent}80, ${foil.accent})`,
                      boxShadow: `0 0 7px ${foil.accent}65`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase font-bold tracking-wider">Sors EV™</span>
                  <span className="text-[10px] font-black text-emerald-400">+{card.ev}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(card.ev * 5, 100)}%`,
                      boxShadow: "0 0 8px rgba(52,211,153,0.55)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === Footer === */}
          <div
            className="relative z-10 px-4 py-2 border-t flex items-center justify-between shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}
          >
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-white/30" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">46-Factor</span>
            </div>
            {isSettled ? (
              isWin ? (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-black uppercase text-emerald-400">Called It ✓</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[9px] font-black uppercase text-red-400">Missed</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80">Pending</span>
              </div>
            )}
          </div>

          {instanceNumber && card.maxCopies && (
            <div
              className="relative z-10 px-4 pb-2 flex items-center justify-between shrink-0"
            >
              <span className="text-[8px] font-mono text-white/20">
                #{String(instanceNumber).padStart(3, "0")} / {card.maxCopies}
              </span>
              <span className="text-[8px] text-white/15 font-medium">SORS MAXIMA™</span>
            </div>
          )}

          {/* Result Stamp */}
          {isSettled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-[-12deg] z-20">
              <div
                className={`border-[6px] px-6 py-2 text-3xl font-black uppercase tracking-widest ${
                  isWin
                    ? "border-emerald-500 text-emerald-500"
                    : "border-red-500 text-red-500"
                }`}
                style={{ opacity: 0.22, letterSpacing: "0.15em" }}
              >
                {isWin ? "WINNER" : "MISSED"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === BACK === */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center"
        style={{
          transform: "rotateY(180deg)",
          backfaceVisibility: "hidden",
          background: "linear-gradient(160deg,#080810 0%,#0c0c1a 50%,#060610 100%)",
          border: `2px solid ${foil.border}`,
          borderColor: `${foil.accent}40`,
        }}
      >
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)",
          backgroundSize: "18px 18px",
        }} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${foil.accent}18 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10 space-y-4">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2"
            style={{
              background: `${foil.accent}15`,
              borderColor: `${foil.accent}40`,
              boxShadow: `0 0 30px ${foil.accent}30`,
            }}
          >
            <Trophy className="w-8 h-8" style={{ color: foil.accent }} />
          </div>
          <div>
            <div
              className="text-lg font-black tracking-tighter"
              style={{ color: foil.accent }}
            >
              SORS MAXIMA™
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">SORS CERTIFIED ✓</span>
              <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">
              {instanceNumber ? `#${instanceNumber.toString().padStart(6, "0")}` : "UNIQUE COPY"}
            </p>
            {card.gameTime && (
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                Issued: {new Date(card.gameTime).toLocaleDateString()}
              </p>
            )}
          </div>

          {collectionId && (
            <div className="pt-2 space-y-2">
              <button
                onClick={toggleShowcase}
                disabled={isShowcaseToggling}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 mx-auto",
                  isPublicShowcase 
                    ? "bg-primary/20 text-primary border border-primary/40" 
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                {isShowcaseToggling ? (
                  <span className="animate-pulse">...</span>
                ) : isPublicShowcase ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>✓ Shared</span>
                  </>
                ) : (
                  <>
                    <span>📢 Share to Community</span>
                  </>
                )}
              </button>

              {canAccess("whale") ? (
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/c/${collectionId}`;
                      await navigator.clipboard.writeText(url);
                      setCopiedProof("link");
                      toast({ title: "Proof link copied!", description: "Share it to prove this win is real." });
                      setTimeout(() => setCopiedProof(null), 2500);
                    }}
                    data-testid={`button-copy-proof-${collectionId}`}
                    className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10"
                    style={{ color: copiedProof === "link" ? "#22c55e" : "rgba(255,255,255,0.45)" }}
                  >
                    {copiedProof === "link" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    {copiedProof === "link" ? "Copied!" : "Proof Link"}
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/c/${collectionId}`;
                      const isWin = card.settledResult === "won";
                      const isPending = !card.settledResult || card.settledResult === "pending";
                      const resultLabel = isWin ? "✅ CALLED IT" : isPending ? "⏳ LIVE PICK" : "❌ MISSED";
                      const gradeEmoji = card.grade?.startsWith("A") ? "🏆" : card.grade?.startsWith("B") ? "⚡" : "📊";
                      const oddsStr = card.odds > 0 ? `+${card.odds}` : `${card.odds}`;
                      const msg = [
                        `${gradeEmoji} **SORS MAXIMA™ VERIFIED PICK**`,
                        `━━━━━━━━━━━━━━━━━━━━`,
                        `🎯 **${card.pick}**`,
                        `🏅 Grade: **${card.grade}** | Sport: ${card.sport}`,
                        card.game ? `🏟️ ${card.game}` : null,
                        `💰 Odds: ${oddsStr}`,
                        `📊 Result: ${resultLabel}`,
                        `━━━━━━━━━━━━━━━━━━━━`,
                        `🔗 Verify: ${url}`,
                        `*Cannot be fabricated — Sors 46-Factor Engine™*`,
                      ].filter(Boolean).join("\n");
                      await navigator.clipboard.writeText(msg);
                      setCopiedProof("discord");
                      toast({ title: "Discord message copied!", description: "Paste it into your server." });
                      setTimeout(() => setCopiedProof(null), 2500);
                    }}
                    data-testid={`button-copy-discord-${collectionId}`}
                    className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 border"
                    style={{
                      background: copiedProof === "discord" ? "rgba(34,197,94,0.15)" : "rgba(var(--primary-rgb, 34 197 94) / 0.10)",
                      borderColor: copiedProof === "discord" ? "rgba(34,197,94,0.40)" : "rgba(var(--primary-rgb, 34 197 94) / 0.25)",
                      color: copiedProof === "discord" ? "#22c55e" : "hsl(var(--primary))",
                    }}
                  >
                    {copiedProof === "discord" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                    {copiedProof === "discord" ? "Copied!" : "Discord"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1">
                  <span className="text-[9px] text-amber-400/60 font-bold uppercase tracking-wider">👑 Max — Discord Proof</span>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-3 border-t border-white/8 max-w-[180px] mx-auto">
            <p className="text-[9px] text-white/30 leading-relaxed">
              Verified signal from the Sors 46-Factor Intelligence Engine. Collect, trade, and showcase your best picks.
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="text-[8px] font-mono text-white/15 tracking-widest uppercase">Secured by Sors 46-Factor Engine</div>
        </div>
      </div>
    </div>
  );
}
