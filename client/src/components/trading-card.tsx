import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Brain, Trophy, Zap, Info, Target, TrendingUp, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { getGradeGlow, getGradeShimmerClass } from "@/lib/grade-utils";
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
  NCAAB: "🏀", MMA: "🥊", SOCCER: "⚽",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "from-amber-400/30 to-yellow-600/20 text-amber-400 border-amber-500/40",
  "A": "from-emerald-400/30 to-green-600/20 text-emerald-400 border-emerald-500/40",
  "B+": "from-teal-400/25 to-cyan-600/15 text-teal-400 border-teal-500/30",
  "B": "from-blue-400/25 to-indigo-600/15 text-blue-400 border-blue-500/30",
  "C": "from-yellow-400/20 to-orange-600/10 text-yellow-500 border-yellow-500/20",
  "D": "from-red-400/15 to-red-600/5 text-red-500 border-red-500/15",
  "F": "from-gray-400/15 to-gray-600/5 text-gray-500 border-gray-500/15",
};

export function TradingCard({ 
  card, 
  instanceNumber, 
  className = "", 
  showBack = false,
  isFlippable = false,
  onFlip,
  isFlipped: isFlippedProp
}: TradingCardProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [internalFlipped, setInternalFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isFlipped = isFlippedProp ?? internalFlipped;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleFlip = () => {
    if (!isFlippable) return;
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped(!internalFlipped);
    }
  };

  const gradeClass = GRADE_COLORS[card.grade.toUpperCase()] || GRADE_COLORS["F"];
  const isSettled = !!card.settledResult;
  const isWin = card.settledResult === "won";
  const isA = card.grade.startsWith("A");

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative w-[280px] h-[400px] transition-all duration-500 ease-out perspective-1000 cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleFlip}
      style={{
        transform: isFlipped
          ? "rotateY(180deg)"
          : isHovered 
          ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)` 
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d"
      }}
      data-testid={`trading-card-${card.id}`}
    >
      {/* Front of Card */}
      <div className="absolute inset-0 backface-hidden" style={{ backfaceVisibility: "hidden" }}>
        {/* Grade Ambient Glow */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-50 blur-xl transition-opacity duration-300"
          style={{ boxShadow: getGradeGlow(card.grade) }}
        />

        <Card className={`relative h-full w-full rounded-2xl border-2 overflow-hidden bg-gradient-to-br from-card/95 to-background flex flex-col ${isA ? "animate-shimmer-border" : ""} ${isSettled ? "border-muted" : "border-primary/20"}`}>
          
          {/* Holographic Overlay for A grades */}
          {isA && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent mix-blend-overlay opacity-30 animate-pulse" />
          )}

          {/* Top Section: Grade & Sport */}
          <div className={`px-4 py-3 bg-gradient-to-r ${gradeClass} flex items-center justify-between border-b`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{SPORT_ICONS[card.sport] || "🎯"}</span>
              <span className="text-xs font-black tracking-widest uppercase">{card.sport}</span>
            </div>
            <Badge className={`font-black text-lg px-2 py-0 ${gradeClass} border-2 shadow-sm`}>
              {card.grade}
            </Badge>
          </div>

          {/* Main Art/Pick Area */}
          <div className="flex-1 flex flex-col px-4 py-4 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{card.game}</p>
              <h3 className="text-lg font-black leading-tight tracking-tight">{card.pick}</h3>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {card.odds > 0 ? `+${card.odds}` : card.odds}
              </Badge>
              <span className="text-[10px] text-muted-foreground uppercase">{card.betType.replace("_", " ")}</span>
            </div>

            {/* Sors Intelligence Section */}
            <div className="mt-auto space-y-3 pb-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Confidence</span>
                    <span className="text-[10px] font-bold">{card.confidence}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${card.confidence}%` }} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Sors EV</span>
                    <span className="text-[10px] font-bold text-emerald-500">+{card.ev}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${Math.min(card.ev * 5, 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Intelligence Stamp</span>
                </div>
                {instanceNumber && card.maxCopies && (
                  <span className="text-[9px] font-mono text-muted-foreground">
                    #{instanceNumber} / {card.maxCopies}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Footer */}
          <div className={`px-4 py-2 border-t flex items-center justify-between ${isSettled ? (isWin ? "bg-emerald-500/10" : "bg-red-500/10") : "bg-muted/30"}`}>
            {!isSettled ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Pending Result</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {isWin ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-emerald-500">CALLED IT</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-black uppercase text-red-500">MISSED</span>
                  </>
                )}
              </div>
            )}
            <span className="text-[9px] text-muted-foreground font-medium">
              {new Date(card.gameTime).toLocaleDateString()}
            </span>
          </div>

          {/* Result Stamp (Large Overlay) */}
          {isSettled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-12 opacity-20">
               <div className={`border-8 px-6 py-2 text-4xl font-black uppercase ${isWin ? "border-emerald-500 text-emerald-500" : "border-red-500 text-red-500"}`}>
                 {isWin ? "WINNER" : "MISSED"}
               </div>
            </div>
          )}
        </Card>
      </div>

      {/* Back of Card */}
      <div 
        className="absolute inset-0 rounded-2xl border-4 border-primary/40 bg-slate-900 flex flex-col items-center justify-center p-6 text-center overflow-hidden"
        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
            <Trophy className="w-12 h-12 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xl font-black tracking-tighter text-white">SORS MAXIMA</h4>
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Intelligence Card</p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This card represents a verified intelligence signal from the Sors Maxima predictive engine.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="w-1 h-1 rounded-full bg-primary/40" />
            <div className="w-1 h-1 rounded-full bg-primary/40" />
            <div className="w-1 h-1 rounded-full bg-primary/40" />
          </div>
        </div>
        
        <div className="absolute bottom-4 left-0 right-0">
          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/60">
            SECURED BY QUANTUM FUSION
          </Badge>
        </div>
      </div>
    </div>
  );
}

