import { useState, useRef } from "react";
import { CheckCircle2, XCircle, Copy, MessageSquare, Lock, AlertTriangle } from "lucide-react";
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
    cardType?: string;
    isFrozen?: boolean;
    frozenReason?: string;
    isRevoked?: boolean;
    revokedReason?: string;
  };
  instanceNumber?: number;
  collectionId?: number;
  isPublicShowcase?: boolean;
  isFeatured?: boolean;
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

const GRADE_FOIL: Record<string, { bg: string; border: string; badge: string; accent: string; glow: string; baseBg: string }> = {
  "S+": {
    bg: "from-violet-900 via-fuchsia-950 to-violet-900",
    baseBg: "#0f0018",
    border: "border-fuchsia-400",
    badge: "bg-fuchsia-400/25 text-fuchsia-200 border-fuchsia-400/70",
    accent: "#e879f9",
    glow: "0 0 60px rgba(232,121,249,0.6), 0 0 120px rgba(232,121,249,0.25), 0 0 8px rgba(232,121,249,0.9)",
  },
  "A+": {
    bg: "from-amber-900 via-yellow-950 to-amber-900",
    baseBg: "#1a0c00",
    border: "border-amber-400",
    badge: "bg-amber-400/25 text-amber-200 border-amber-400/70",
    accent: "#fbbf24",
    glow: "0 0 50px rgba(251,191,36,0.55), 0 0 100px rgba(251,191,36,0.2), 0 0 6px rgba(251,191,36,0.8)",
  },
  "A": {
    bg: "from-emerald-900 via-green-950 to-emerald-900",
    baseBg: "#001a0a",
    border: "border-emerald-400",
    badge: "bg-emerald-400/25 text-emerald-200 border-emerald-400/60",
    accent: "#34d399",
    glow: "0 0 40px rgba(52,211,153,0.5), 0 0 80px rgba(52,211,153,0.18)",
  },
  "B+": {
    bg: "from-teal-900 via-cyan-950 to-teal-900",
    baseBg: "#00141a",
    border: "border-teal-400",
    badge: "bg-teal-400/20 text-teal-200 border-teal-400/55",
    accent: "#2dd4bf",
    glow: "0 0 32px rgba(45,212,191,0.45), 0 0 64px rgba(45,212,191,0.15)",
  },
  "B": {
    bg: "from-blue-900 via-indigo-950 to-blue-900",
    baseBg: "#000a1a",
    border: "border-blue-400",
    badge: "bg-blue-400/20 text-blue-200 border-blue-400/50",
    accent: "#60a5fa",
    glow: "0 0 28px rgba(96,165,250,0.4), 0 0 56px rgba(96,165,250,0.12)",
  },
  "C+": {
    bg: "from-yellow-900 via-orange-950 to-yellow-900",
    baseBg: "#1a1200",
    border: "border-yellow-500",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/45",
    accent: "#facc15",
    glow: "0 0 22px rgba(250,204,21,0.35)",
  },
  "C": {
    bg: "from-slate-800 via-zinc-900 to-slate-800",
    baseBg: "#0a0a10",
    border: "border-slate-500",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/35",
    accent: "#94a3b8",
    glow: "0 0 16px rgba(148,163,184,0.22)",
  },
  "D": {
    bg: "from-red-900 via-rose-950 to-red-900",
    baseBg: "#1a0000",
    border: "border-red-500",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    accent: "#f87171",
    glow: "0 0 14px rgba(248,113,113,0.2)",
  },
  "F": {
    bg: "from-gray-800 via-zinc-900 to-gray-800",
    baseBg: "#080808",
    border: "border-gray-600",
    badge: "bg-gray-600/15 text-gray-400 border-gray-600/20",
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
  if (g === "S+") return { label: "🌟 LIFE CHANGER", color: "text-fuchsia-400" };
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

  const safeGrade = card.grade ?? "F";
  const gradeKey = Object.keys(GRADE_FOIL).find(k =>
    safeGrade.toUpperCase() === k || safeGrade.toUpperCase() === k.toUpperCase()
  ) || "F";
  const foil = GRADE_FOIL[gradeKey] || GRADE_FOIL["F"];
  const sportPattern = SPORT_PATTERNS[card.sport ?? ""] || "";
  const sportIcon = SPORT_ICONS[card.sport ?? ""] || "🎯";
  const eventLabel = getEventLabel(card.sport ?? "", card.gameTime);
  const rarity = getRarityLabel(safeGrade);
  const isSPlus = safeGrade === "S+";
  const isAPlus = safeGrade === "A+" || isSPlus;
  const isAPremium = safeGrade.startsWith("A") || safeGrade === "B+" || isSPlus;
  const isSettled = !!card.settledResult;
  const isWin = card.settledResult === "won";

  const calcReturn = (stake: number) => {
    if (!card.odds || Math.abs(card.odds) >= 2000) return null;
    const decimal = card.odds > 0
      ? 1 + card.odds / 100
      : 1 + 100 / Math.abs(card.odds);
    const payout = stake * decimal;
    if (payout >= 1000) return `$${(payout / 1000).toFixed(1)}K`;
    return `$${payout.toFixed(0)}`;
  };
  const potentialReturn = card.odds > 0
    ? (100 + card.odds).toFixed(0)
    : (100 + (10000 / Math.abs(card.odds))).toFixed(0);
  const ret1   = calcReturn(1);
  const ret10  = calcReturn(10);
  const ret100 = calcReturn(100);

  return (
    /*
     * ── Card container ─────────────────────────────────────────────────────
     * perspective MUST be on a PARENT of the flip element — putting it on the
     * same element as transformStyle + rotation breaks backface-visibility on
     * mobile (cards bleed through each other).
     */
    <div
      ref={cardRef}
      className={cn("relative w-full h-full cursor-pointer select-none", className)}
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleFlip}
      data-testid={`trading-card-${card.id}`}
    >
      {/* ── Flip container: this is the only element that transforms ── */}
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d" as any,
          transform: isFlipped
            ? "rotateY(180deg)"
            : isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.03,1.03,1.03)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}
      >

      {/* === FRONT === */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden" as any,
          /* Solid opaque base — prevents any bleed-through from back face */
          backgroundColor: foil.baseBg,
        }}
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
          style={{
            backgroundColor: foil.baseBg,
            backgroundImage: sportPattern
              ? sportPattern
              : undefined,
          }}
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
              height: "5px",
              background: isAPlus
                ? "linear-gradient(90deg,#ff0080,#ff8000,#ffff00,#00ff80,#00c8ff,#8000ff,#ff0080)"
                : `linear-gradient(90deg, ${foil.accent}, rgba(255,255,255,0.5), ${foil.accent})`,
              backgroundSize: "200% 100%",
              animation: isAPremium ? "holo-rainbow-bar 3s linear infinite" : undefined,
            }}
          />

          {/* ── POKÉMON-STYLE HEADER: Pick Name + Odds ── */}
          <div className="relative z-10 px-3 pt-2.5 pb-2 flex items-start justify-between shrink-0">
            {/* Left: sport icon + rarity label + pick name */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-lg leading-none drop-shadow-md">{sportIcon}</span>
                <span
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: foil.accent }}
                >{rarity.label}</span>
                {card.cardType === "system" && (
                  <span style={{ fontSize: 7, fontWeight: 900, color: "rgba(251,191,36,0.80)", letterSpacing: "0.12em" }}>✦ SYSTEM</span>
                )}
                {card.cardType === "admin_seeded" && (
                  <span style={{ fontSize: 7, fontWeight: 900, color: "rgba(148,163,184,0.65)", letterSpacing: "0.12em" }}>◈ DEMO</span>
                )}
              </div>
              <h2
                className="font-black leading-tight text-white"
                style={{ fontSize: "17px", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >{card.pick}</h2>
            </div>
            {/* Right: Odds (like Pokémon HP) + Grade badge */}
            <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[8px] font-black uppercase text-white/30">ODDS</span>
                <span
                  className="text-[20px] font-black leading-none tabular-nums"
                  style={{ color: foil.accent, textShadow: `0 0 16px ${foil.accent}70`, fontFamily: "Georgia, serif" }}
                >
                  {card.odds > 0 ? `+${card.odds}` : card.odds}
                </span>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${foil.accent}70`,
                  background: `${foil.accent}10`,
                  boxShadow: `0 0 12px ${foil.accent}40`,
                }}
              >
                <span className="font-black text-sm leading-none" style={{ color: foil.accent }}>{safeGrade}</span>
              </div>
            </div>
          </div>

          {/* ── INSET ART BOX (Pokémon-style illustrated frame) ── */}
          {(() => {
            const teams = parseTeams(card.game);
            return (
              <div className="relative z-10 px-3 shrink-0">
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid ${foil.accent}35`,
                    boxShadow: `inset 0 0 24px ${foil.accent}12, 0 0 0 1px rgba(255,255,255,0.05)`,
                    background: `linear-gradient(135deg, ${foil.accent}18 0%, rgba(0,0,0,0.45) 70%, ${foil.accent}08 100%)`,
                    minHeight: "88px",
                    padding: "10px 12px 10px",
                  }}
                >
                  {/* Background sport emoji watermark — very subtle */}
                  <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-none leading-none"
                    style={{ fontSize: "52px", opacity: 0.07 }}
                    aria-hidden="true"
                  >{sportIcon}</div>

                  {teams.away ? (
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${foil.accent}90` }}>Home</p>
                          <p className="font-black text-[13px] leading-snug text-white truncate">{teams.home}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-center gap-0.5 px-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: `${foil.accent}20`, border: `1px solid ${foil.accent}50` }}
                          >
                            <span className="text-[8px] font-black" style={{ color: foil.accent }}>VS</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${foil.accent}90` }}>Away</p>
                          <p className="font-black text-[13px] leading-snug text-white truncate">{teams.away}</p>
                        </div>
                      </div>
                      {/* Divider line */}
                      <div className="h-px mb-1.5" style={{ background: `linear-gradient(90deg, transparent, ${foil.accent}40, transparent)` }} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-black uppercase text-white/25 shrink-0 w-12">Power</span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${card.confidence}%`, background: `linear-gradient(90deg, ${foil.accent}70, ${foil.accent})`, boxShadow: `0 0 5px ${foil.accent}50` }} />
                        </div>
                        <span className="text-[9px] font-black tabular-nums shrink-0" style={{ color: foil.accent }}>{card.confidence}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-center gap-2 py-1">
                      <div className="text-4xl drop-shadow-lg" style={{ filter: isAPlus ? `drop-shadow(0 0 10px ${foil.accent})` : undefined }}>{sportIcon}</div>
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-[7px] font-black uppercase text-white/25 shrink-0">Power</span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${card.confidence}%`, background: `linear-gradient(90deg, ${foil.accent}70, ${foil.accent})` }} />
                        </div>
                        <span className="text-[9px] font-black tabular-nums shrink-0" style={{ color: foil.accent }}>{card.confidence}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── TYPE + EVENT TAG ROW ── */}
          <div className="relative z-10 px-3 pt-2 flex items-center gap-1.5 flex-wrap shrink-0">
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ background: `${foil.accent}20`, borderColor: `${foil.accent}55`, color: foil.accent }}
            >{card.sport}</span>
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.70)" }}
            >{(card.betType ?? "").replace(/_/g, " ")}</span>
            {eventLabel && (
              <span
                className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ background: `${foil.accent}10`, borderColor: `${foil.accent}35`, color: `${foil.accent}CC`, textShadow: `0 0 6px ${foil.accent}55` }}
              >{eventLabel}</span>
            )}
            {card.ev >= 15 && (
              <span className="text-[7px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.12)", color: "rgba(251,191,36,0.90)" }}>🔥 HIGH EDGE</span>
            )}
            {isAPlus && (
              <span className="text-[7px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.10)", color: "rgba(251,191,36,0.80)" }}>◆ LEGENDARY</span>
            )}
          </div>

          {/* ── STAT BARS (Pokémon-style weakness/resistance) ── */}
          <div className="relative z-10 px-3 pt-2 space-y-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-white/55 shrink-0" style={{ width: "58px" }}>Conviction</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                <div className="h-full rounded-full" style={{ width: `${card.confidence}%`, background: `linear-gradient(90deg, ${foil.accent}80, ${foil.accent})`, boxShadow: `0 0 6px ${foil.accent}60` }} />
              </div>
              <span className="text-[10px] font-black tabular-nums shrink-0" style={{ color: foil.accent, minWidth: "32px", textAlign: "right" }}>{card.confidence}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-white/55 shrink-0" style={{ width: "58px" }}>Sors EV™</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(card.ev * 5, 100)}%`, boxShadow: "0 0 6px rgba(52,211,153,0.55)" }} />
              </div>
              <span className="text-[10px] font-black tabular-nums text-emerald-400 shrink-0" style={{ minWidth: "32px", textAlign: "right" }}>+{card.ev}%</span>
            </div>
          </div>

          {/* ── PAYOUT ROW ── */}
          {ret1 && ret10 && ret100 && (
            <div
              className="relative z-10 mx-3 mt-2 rounded-lg px-2.5 py-2 shrink-0"
              style={{
                background: isWin ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.035)",
                border: `1px solid ${isWin ? "rgba(251,191,36,0.40)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <div className="text-[7px] font-black uppercase tracking-widest mb-1.5" style={{ color: isWin ? "rgba(251,191,36,0.70)" : "rgba(255,255,255,0.28)" }}>
                {isWin ? "★ If You Bet" : "If You Bet"}
              </div>
              <div className="flex items-center justify-around">
                {[{ stake: "$1", val: ret1 }, { stake: "$10", val: ret10 }, { stake: "$100", val: ret100 }].map(({ stake, val }) => (
                  <div key={stake} className="flex flex-col items-center gap-0.5">
                    <span className="text-[7px] font-black uppercase" style={{ color: isWin ? "rgba(251,191,36,0.50)" : "rgba(255,255,255,0.22)" }}>{stake}</span>
                    <span className="text-[11px] font-black tabular-nums" style={{ color: isWin ? "#FBBF24" : "rgba(52,211,153,0.85)", textShadow: isWin ? "0 0 10px rgba(251,191,36,0.55)" : "none" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FOOTER (Pokémon-style card bottom) ── */}
          <div
            className="relative z-10 mt-auto px-3 py-2 border-t flex items-center justify-between shrink-0"
            style={{ borderColor: `${foil.accent}20`, background: "rgba(0,0,0,0.40)" }}
          >
            {/* Left: instance number or 46-Factor */}
            <div className="flex items-center gap-1">
              {instanceNumber && card.maxCopies ? (
                <span className="text-[7px] font-mono" style={{ color: `${foil.accent}55` }}>
                  {String(instanceNumber).padStart(3, "0")}/{card.maxCopies}
                </span>
              ) : (
                <span className="text-[7px] font-black uppercase tracking-widest text-white/20">46-Factor™</span>
              )}
            </div>

            {/* Center: flip hint */}
            {isFlippable && !isSettled && (
              <span className="text-[7px] font-black uppercase tracking-widest text-white/18">↺ flip</span>
            )}

            {/* Right: result / status */}
            <div>
              {isSettled ? (
                isWin ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[8px] font-black uppercase text-emerald-400">Called It ✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-white/28" />
                    <span className="text-[8px] font-black uppercase text-white/30">No Hit</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: foil.accent }} />
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${foil.accent}AA` }}>Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* === FROZEN OVERLAY === */}
          {card.isFrozen && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl pointer-events-none"
              style={{ background: "rgba(14,30,60,0.82)", backdropFilter: "blur(2px)" }}>
              <Lock className="w-10 h-10 text-blue-400 mb-2" style={{ filter: "drop-shadow(0 0 8px rgba(96,165,250,0.7))" }} />
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.15em", color: "rgba(147,197,253,0.9)", textTransform: "uppercase" }}>FROZEN</span>
              {card.frozenReason && <span style={{ fontSize: 9, color: "rgba(147,197,253,0.5)", marginTop: 4, textAlign: "center", padding: "0 12px" }}>{card.frozenReason}</span>}
            </div>
          )}

          {/* === REVOKED OVERLAY === */}
          {card.isRevoked && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl pointer-events-none"
              style={{ background: "rgba(50,10,10,0.88)", backdropFilter: "blur(2px)" }}>
              <AlertTriangle className="w-10 h-10 text-red-400 mb-2" style={{ filter: "drop-shadow(0 0 8px rgba(248,113,113,0.7))" }} />
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.15em", color: "rgba(252,165,165,0.9)", textTransform: "uppercase" }}>REVOKED</span>
              {card.revokedReason && <span style={{ fontSize: 9, color: "rgba(252,165,165,0.5)", marginTop: 4, textAlign: "center", padding: "0 12px" }}>{card.revokedReason}</span>}
            </div>
          )}

          {/* Result Corner Ribbon — small and unobtrusive, doesn't block content */}
          {isSettled && (
            <div
              className="absolute top-0 right-0 pointer-events-none z-25 overflow-hidden rounded-tr-2xl"
              style={{ width: 72, height: 72 }}
            >
              {/* Triangle ribbon */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: 0, height: 0,
                borderStyle: "solid",
                borderWidth: "0 72px 72px 0",
                borderColor: isWin
                  ? "transparent rgba(52,211,153,0.70) transparent transparent"
                  : "transparent rgba(255,255,255,0.12) transparent transparent",
              }} />
              {/* Label inside ribbon */}
              <div style={{
                position: "absolute", top: 12, right: 2,
                transform: "rotate(45deg)",
                textAlign: "center",
                width: 52,
              }}>
                <span style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: "0.06em",
                  color: isWin ? "#ffffff" : "rgba(255,255,255,0.55)",
                  textTransform: "uppercase", display: "block", lineHeight: 1.2,
                }}>
                  {isWin ? "WIN ✓" : "MISS"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === BACK === */}
      {/*
       * The back face MUST have a fully opaque background so the front face
       * never bleeds through. We layer: solid baseBg → gradient → overlays.
       */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col p-4"
        style={{
          transform: "rotateY(180deg)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden" as any,
          /* Step 1: solid opaque base – the wall that stops bleed-through */
          backgroundColor: foil.baseBg,
          /* Step 2: rich gradient on top of the solid base */
          backgroundImage: `linear-gradient(160deg, ${foil.baseBg} 0%, #07070f 40%, #0d0d1a 60%, ${foil.baseBg} 100%)`,
          border: `2px solid ${foil.accent}80`,
          /* Crisp inset highlight gives the back a different "feel" from front */
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6)`,
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
        {/* === BACK CONTENT === */}
        {(() => {
          const odds = card.odds ?? 0;
          const ev = card.ev ?? 0;
          const conf = card.confidence ?? 0;
          const bt = (card.betType ?? "").toLowerCase();
          const implied = odds > 0
            ? Math.round(10000 / (odds + 100))
            : Math.round(Math.abs(odds) / (Math.abs(odds) + 100) * 100);

          const strategy: { name: string; icon: string; color: string; tagline: string; signals: string[] } =
            odds >= 300
              ? { name: "LONGSHOT SLEEPER", icon: "💎", color: "#fbbf24", tagline: "Market gap pure profit", signals: ["Price inefficiency", `${implied}% → ${conf}%`] }
              : ev >= 15 && odds > 100
              ? { name: "STEAM DETECTED", icon: "🔥", color: "#f97316", tagline: "Sharp money in early", signals: ["Sharp action", "Line move"] }
              : odds >= 110 && odds < 300
              ? { name: "UNDERDOG VALUE", icon: "⚡", color: "#a78bfa", tagline: "Math beats the crowd", signals: ["Market gap", `+${ev}% edge`] }
              : bt !== "moneyline" && bt !== "h2h"
              ? { name: "ALT-MARKET EDGE", icon: "📐", color: "#2dd4bf", tagline: "Value off the main line", signals: ["Alt-line", `${ev}% EV`] }
              : conf >= 72
              ? { name: "HIGH CONVICTION", icon: "🎯", color: "#34d399", tagline: "All signals aligned", signals: [`${conf}% conviction`, "Full alignment"] }
              : { name: "CONTRARIAN FADE", icon: "↩️", color: "#60a5fa", tagline: "Fade public, trust model", signals: ["Public fade", `+${ev}% EV`] };

          // Confidence arc for SVG: r=44, circumference ≈ 276
          const circ = 276;
          const arc = (conf / 100) * circ;

          return (
            <div className="relative z-10 w-full h-full flex flex-col gap-2">

              {/* ── Header ── */}
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <div className="font-black tracking-tighter text-[14px]" style={{ color: foil.accent }}>SORS MAXIMA™</div>
                  <div className="text-[7px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>Intelligence Card</div>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border"
                  style={{ background: `${foil.accent}15`, borderColor: `${foil.accent}50`, boxShadow: `0 0 10px ${foil.accent}30` }}
                >
                  <span className="font-black text-[11px]" style={{ color: foil.accent }}>{safeGrade}</span>
                </div>
              </div>

              {/* ── RADAR ART ── unique data visualization */}
              <div
                className="relative w-full shrink-0 rounded-xl overflow-hidden"
                style={{ height: 118, background: `radial-gradient(ellipse at 50% 50%, ${foil.accent}12 0%, transparent 65%)`, border: `1px solid ${foil.accent}20` }}
              >
                <svg width="100%" height="118" viewBox="0 0 238 118" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Corner brackets */}
                  <rect x="8" y="8" width="14" height="1.2" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="8" y="8" width="1.2" height="14" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="216" y="8" width="14" height="1.2" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="228.8" y="8" width="1.2" height="14" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="8" y="109" width="14" height="1.2" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="8" y="96" width="1.2" height="14" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="216" y="109" width="14" height="1.2" fill={foil.accent} fillOpacity="0.4"/>
                  <rect x="228.8" y="96" width="1.2" height="14" fill={foil.accent} fillOpacity="0.4"/>

                  {/* Scanning lines — subtle grid */}
                  <line x1="119" y1="4" x2="119" y2="114" stroke={foil.accent} strokeOpacity="0.07" strokeWidth="0.6"/>
                  <line x1="24" y1="59" x2="214" y2="59" stroke={foil.accent} strokeOpacity="0.07" strokeWidth="0.6"/>

                  {/* Outer ring */}
                  <circle cx="119" cy="59" r="44" stroke={foil.accent} strokeOpacity="0.18" strokeWidth="0.8"/>
                  {/* Tick marks every 30° on outer ring */}
                  {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
                    const r = (a - 90) * Math.PI / 180;
                    return <line key={a} x1={119+41*Math.cos(r)} y1={59+41*Math.sin(r)} x2={119+44*Math.cos(r)} y2={59+44*Math.sin(r)} stroke={foil.accent} strokeOpacity="0.35" strokeWidth="1"/>;
                  })}

                  {/* Mid ring */}
                  <circle cx="119" cy="59" r="30" stroke={foil.accent} strokeOpacity="0.14" strokeWidth="0.6"/>

                  {/* Inner ring */}
                  <circle cx="119" cy="59" r="17" stroke={foil.accent} strokeOpacity="0.28" strokeWidth="0.8"/>

                  {/* EV signal dots on mid ring */}
                  {Array.from({ length: Math.min(Math.round(ev / 2.5), 8) }).map((_, i) => {
                    const a = ((i * 45) - 90) * Math.PI / 180;
                    return <circle key={i} cx={119+30*Math.cos(a)} cy={59+30*Math.sin(a)} r="2" fill={foil.accent} fillOpacity={0.25 + i * 0.06}/>;
                  })}

                  {/* Confidence arc — clockwise from top */}
                  <circle cx="119" cy="59" r="44"
                    stroke={foil.accent} strokeWidth="2.5" strokeOpacity="0.65"
                    strokeLinecap="round"
                    strokeDasharray={`${arc} ${circ}`}
                    transform="rotate(-90 119 59)"
                  />

                  {/* Confidence arc end dot */}
                  {(() => {
                    const a = ((conf / 100) * 360 - 90) * Math.PI / 180;
                    return <circle cx={119+44*Math.cos(a)} cy={59+44*Math.sin(a)} r="3" fill={foil.accent} fillOpacity="0.9"/>;
                  })()}

                  {/* Center core glow */}
                  <circle cx="119" cy="59" r="14" fill={foil.accent} fillOpacity="0.06"/>
                  <circle cx="119" cy="59" r="9" fill={foil.accent} fillOpacity="0.10"/>
                  <circle cx="119" cy="59" r="4" fill={foil.accent} fillOpacity="0.20"/>

                  {/* Diagonal axis lines */}
                  <line x1="79" y1="20" x2="159" y2="98" stroke={foil.accent} strokeOpacity="0.06" strokeWidth="0.5"/>
                  <line x1="159" y1="20" x2="79" y2="98" stroke={foil.accent} strokeOpacity="0.06" strokeWidth="0.5"/>

                  {/* Conf label */}
                  <text x="119" y="72" textAnchor="middle" fill={foil.accent} fillOpacity="0.55" fontSize="8" fontWeight="bold" fontFamily="monospace">{conf}%</text>

                  {/* Implied vs model labels */}
                  <text x="30" y="30" fill="white" fillOpacity="0.22" fontSize="6" fontFamily="monospace">MKT {implied}%</text>
                  <text x="170" y="30" fill={foil.accent} fillOpacity="0.55" fontSize="6" fontFamily="monospace">MDL {conf}%</text>
                </svg>

                {/* Sport icon floating in center */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 12 }}>
                  <span style={{ fontSize: 32, lineHeight: 1, filter: `drop-shadow(0 0 10px ${foil.accent}50)` }}>{sportIcon}</span>
                </div>

                {/* EV badge bottom-right of art */}
                <div className="absolute bottom-2 right-3 flex items-center gap-1 pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 4px #10b981" }}/>
                  <span className="text-[7px] font-black tabular-nums" style={{ color: "rgba(52,211,153,0.80)" }}>EV +{ev}%</span>
                </div>
              </div>

              {/* ── Strategy badge — compact ── */}
              <div
                className="w-full rounded-xl px-2.5 py-2 shrink-0"
                style={{ background: `linear-gradient(135deg, ${strategy.color}12 0%, rgba(0,0,0,0.25) 100%)`, border: `1px solid ${strategy.color}30` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[18px] leading-none">{strategy.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-wider leading-none" style={{ color: strategy.color }}>{strategy.name}</div>
                    <div className="text-[8px] mt-0.5 leading-none" style={{ color: `${strategy.color}90` }}>{strategy.tagline}</div>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    {strategy.signals.map(s => (
                      <span key={s} className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full text-right"
                        style={{ background: `${strategy.color}18`, color: `${strategy.color}CC`, border: `1px solid ${strategy.color}28` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Stats grid ── */}
              <div className="grid grid-cols-4 gap-1 w-full shrink-0">
                {[
                  { label: "Grade", value: safeGrade, color: foil.accent },
                  { label: "Odds", value: odds > 0 ? `+${odds}` : `${odds}`, color: foil.accent },
                  { label: "Conv", value: `${conf}%`, color: "#34d399" },
                  { label: "EV", value: `+${ev}%`, color: "#34d399" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg py-1.5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <p className="text-[7px] font-bold uppercase tracking-wide text-white/40">{label}</p>
                    <p className="text-[10px] font-black mt-0.5 tabular-nums" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Payout row ── */}
              {ret1 && ret10 && ret100 && (
                <div className="w-full rounded-xl px-2.5 py-2 shrink-0"
                  style={{ background: isWin ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${isWin ? "rgba(251,191,36,0.40)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: isWin ? "rgba(251,191,36,0.60)" : "rgba(255,255,255,0.25)" }}>
                    {isWin ? "★ This Win Paid" : "If You Bet"}
                  </div>
                  <div className="flex items-end justify-around">
                    {[{ stake: "$1", val: ret1 }, { stake: "$10", val: ret10 }, { stake: "$100", val: ret100 }].map(({ stake, val }) => val ? (
                      <div key={stake} className="flex flex-col items-center gap-0.5">
                        <span className="text-[7px] font-black uppercase" style={{ color: isWin ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.20)" }}>{stake}</span>
                        <span className="font-black tabular-nums leading-none"
                          style={{ fontSize: stake === "$100" ? "16px" : "11px", color: isWin ? "#FCD34D" : "rgba(52,211,153,0.80)", fontFamily: "Georgia, serif" }}>
                          {val}
                        </span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* ── Action Buttons ── */}
              {collectionId && (
                <div className="space-y-1.5 shrink-0">
                  <button
                    onClick={toggleShowcase}
                    disabled={isShowcaseToggling}
                    className={cn(
                      "w-full px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      isPublicShowcase ? "border border-primary/40 text-primary" : "border border-white/10 text-white/50"
                    )}
                    style={{ background: isPublicShowcase ? "rgba(var(--primary-rgb,34 197 94)/0.08)" : "rgba(255,255,255,0.03)" }}
                  >
                    {isShowcaseToggling ? "..." : isPublicShowcase ? <><CheckCircle2 className="w-2.5 h-2.5"/>✓ In Community</> : <>📢 Share to Community</>}
                  </button>

                  {canAccess("whale") ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={async (e) => { e.stopPropagation(); const url = `${window.location.origin}/c/${collectionId}`; await navigator.clipboard.writeText(url); setCopiedProof("link"); toast({ title: "Proof link copied!" }); setTimeout(() => setCopiedProof(null), 2500); }}
                        data-testid={`button-copy-proof-${collectionId}`}
                        className="flex-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border transition-colors"
                        style={{ background: "rgba(255,255,255,0.03)", borderColor: copiedProof === "link" ? "rgba(34,197,94,0.40)" : "rgba(255,255,255,0.10)", color: copiedProof === "link" ? "#22c55e" : "rgba(255,255,255,0.45)" }}
                      >
                        {copiedProof === "link" ? <><CheckCircle2 className="w-2.5 h-2.5"/>Copied!</> : <><Copy className="w-2.5 h-2.5"/>Proof Link</>}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/c/${collectionId}`;
                          const oddsStr = card.odds > 0 ? `+${card.odds}` : `${card.odds}`;
                          const resultLabel = isWin ? "✅ CALLED IT" : !card.settledResult ? "⏳ LIVE" : "✗ NO HIT";
                          const msg = [`🎯 **SORS MAXIMA™ VERIFIED PICK**`, `**${card.pick}**`, `Grade: ${card.grade} | ${card.sport} | ${oddsStr}`, `Result: ${resultLabel}`, `🔗 ${url}`].join("\n");
                          await navigator.clipboard.writeText(msg);
                          setCopiedProof("discord");
                          toast({ title: "Discord message copied!" });
                          setTimeout(() => setCopiedProof(null), 2500);
                        }}
                        data-testid={`button-copy-discord-${collectionId}`}
                        className="flex-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border transition-colors"
                        style={{ background: copiedProof === "discord" ? "rgba(34,197,94,0.08)" : "rgba(var(--primary-rgb,34 197 94)/0.05)", borderColor: copiedProof === "discord" ? "rgba(34,197,94,0.40)" : "rgba(var(--primary-rgb,34 197 94)/0.25)", color: copiedProof === "discord" ? "#22c55e" : "hsl(var(--primary))" }}
                      >
                        {copiedProof === "discord" ? <><CheckCircle2 className="w-2.5 h-2.5"/>Copied!</> : <><MessageSquare className="w-2.5 h-2.5"/>Discord</>}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-[7px] text-amber-400/50 font-bold uppercase tracking-wider">👑 Max tier unlocks Discord Proof</p>
                  )}
                </div>
              )}

              {/* ── Footer ── */}
              <div className="flex items-center justify-between w-full mt-auto pt-1.5 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[7px] font-mono" style={{ color: `${foil.accent}40` }}>
                  {instanceNumber ? `#${instanceNumber.toString().padStart(6, "0")}` : "SORS MAXIMA™"}
                </span>
                {isSettled ? (
                  isWin
                    ? <div className="flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-400"/><span className="text-[7px] font-black uppercase text-emerald-400">Called It ✓</span></div>
                    : <span className="text-[7px] font-black uppercase text-white/22">No Hit</span>
                ) : (
                  <div className="flex items-center gap-1 animate-pulse">
                    <div className="w-1 h-1 rounded-full" style={{ background: foil.accent }}/>
                    <span className="text-[7px] font-black uppercase" style={{ color: `${foil.accent}90` }}>Live</span>
                  </div>
                )}
              </div>

            </div>
          );
        })()}
      </div>

      </div> {/* ── end flip container ── */}
    </div>
  );
}
