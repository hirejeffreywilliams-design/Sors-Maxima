import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain, Trophy, CheckCircle2, XCircle } from "lucide-react";
import { getGradeGlow } from "@/lib/grade-utils";
import { cn } from "@/lib/utils";

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
  };
  instanceNumber?: number;
  className?: string;
  showBack?: boolean;
  isFlippable?: boolean;
  onFlip?: () => void;
  isFlipped?: boolean;
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
  isFlipped: isFlippedProp
}: TradingCardProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [internalFlipped, setInternalFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isFlipped = isFlippedProp ?? internalFlipped;

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
              <div className="text-[8px] font-bold text-white/25 uppercase tracking-wider">Grade</div>
            </div>
          </div>

          {/* === Art Area === */}
          <div className="relative z-10 flex flex-col items-center justify-center px-4 py-3 shrink-0"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${foil.accent}15 0%, transparent 70%)`,
              minHeight: "80px",
            }}
          >
            <div className="text-5xl drop-shadow-lg" style={{
              filter: isAPlus ? `drop-shadow(0 0 12px ${foil.accent})` : undefined,
              animation: isAPlus ? "pulse 2s ease-in-out infinite" : undefined,
            }}>
              {sportIcon}
            </div>
            {eventLabel && (
              <div
                className="mt-2 text-[9px] font-black tracking-widest uppercase px-3 py-0.5 rounded-full border"
                style={{
                  background: `${foil.accent}18`,
                  borderColor: `${foil.accent}45`,
                  color: foil.accent,
                  textShadow: `0 0 8px ${foil.accent}60`,
                }}
              >
                {eventLabel}
              </div>
            )}
          </div>

          {/* === Pick Info === */}
          <div className="relative z-10 flex-1 flex flex-col px-4 py-3 gap-2 min-h-0">
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
            <div className="space-y-2 mt-auto">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase font-bold">Conviction</span>
                  <span className="text-[9px] font-black text-white/80">{card.confidence}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${card.confidence}%`,
                      background: `linear-gradient(90deg, ${foil.accent}90, ${foil.accent})`,
                      boxShadow: `0 0 6px ${foil.accent}60`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase font-bold">Sors EV™</span>
                  <span className="text-[9px] font-black text-emerald-400">+{card.ev}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(card.ev * 5, 100)}%`,
                      boxShadow: "0 0 6px rgba(52,211,153,0.5)",
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
        <div className="relative z-10 space-y-5">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2"
            style={{
              background: `${foil.accent}15`,
              borderColor: `${foil.accent}40`,
              boxShadow: `0 0 30px ${foil.accent}30`,
            }}
          >
            <Trophy className="w-10 h-10" style={{ color: foil.accent }} />
          </div>
          <div>
            <div
              className="text-lg font-black tracking-tighter"
              style={{ color: foil.accent }}
            >
              SORS MAXIMA™
            </div>
            <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase mt-1">
              Intelligence Card
            </div>
            <div className={`text-xs font-black mt-2 ${rarity.color}`}>{rarity.label}</div>
          </div>
          <div className="pt-3 border-t border-white/8 max-w-[180px]">
            <p className="text-[9px] text-white/30 leading-relaxed">
              Verified signal from the Sors 46-Factor Intelligence Engine. Collect, trade, and showcase your best picks.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {[foil.accent, "rgba(255,255,255,0.3)", foil.accent].map((c, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="text-[8px] font-mono text-white/15 tracking-widest">SECURED BY SORS 46-FACTOR ENGINE</div>
        </div>
      </div>
    </div>
  );
}
