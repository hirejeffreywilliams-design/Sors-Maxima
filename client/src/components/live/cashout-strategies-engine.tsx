import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Zap, TrendingUp, DollarSign, Plus, Trash2, ArrowDown,
  CheckCircle2, AlertCircle, Target, Lock, Flame, BarChart2,
  ChevronRight, Info, Trophy, Clock, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SweatLeg {
  id: string;
  label: string;
  americanOdds: number;
  role: "anchor" | "pressure";
}

interface LadderStep {
  legIndex: number;
  label: string;
  role: "anchor" | "pressure";
  cumulativeMultiplier: number;
  estimatedCashout: number;
  cashoutROI: number;
  sweatScore: number;
  isBreakeven: boolean;
  isSweetSpot: boolean;
  isOptimalExit: boolean;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function americanToDecimal(odds: number): number {
  if (odds > 0) return 1 + odds / 100;
  return 1 + 100 / Math.abs(odds);
}

function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function calcLadder(legs: SweatLeg[], stake: number): LadderStep[] {
  let cumulativeMultiplier = 1;
  const steps: LadderStep[] = [];
  const totalMultiplier = legs.reduce((acc, l) => acc * americanToDecimal(l.americanOdds), 1);
  const fullPayout = stake * totalMultiplier;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    cumulativeMultiplier *= americanToDecimal(leg.americanOdds);

    const remainingLegs = legs.slice(i + 1);
    const remainingMultiplier = remainingLegs.reduce((acc, l) => acc * americanToDecimal(l.americanOdds), 1);
    const remainingWinProb = remainingLegs.reduce((acc, l) => acc * americanToImplied(l.americanOdds), 1);
    const bookHoldFactor = i === legs.length - 1 ? 1 : 0.87;
    const estimatedCashout = remainingLegs.length === 0
      ? stake * cumulativeMultiplier
      : stake * cumulativeMultiplier * remainingMultiplier * remainingWinProb * bookHoldFactor;

    const cashoutROI = ((estimatedCashout - stake) / stake) * 100;
    const sweatScore = Math.round(Math.min(100, ((cumulativeMultiplier - 1) / (totalMultiplier - 1)) * 100));
    const isBreakeven = cashoutROI >= -5 && cashoutROI < 15;
    const isSweetSpot = cashoutROI >= 15 && cashoutROI < 60;
    const isOptimalExit = cashoutROI >= 60;

    steps.push({
      legIndex: i,
      label: leg.label || `Leg ${i + 1}`,
      role: leg.role,
      cumulativeMultiplier,
      estimatedCashout: Math.round(estimatedCashout * 100) / 100,
      cashoutROI: Math.round(cashoutROI * 10) / 10,
      sweatScore,
      isBreakeven,
      isSweetSpot,
      isOptimalExit,
    });
  }

  return steps;
}

function calcSweatScore(legs: SweatLeg[]): number {
  if (legs.length < 2) return 0;
  const anchorCount = legs.filter(l => l.role === "anchor").length;
  const pressureCount = legs.filter(l => l.role === "pressure").length;
  const structureScore = anchorCount >= 2 && pressureCount >= 1 ? 40 : anchorCount >= 1 ? 20 : 0;
  const anchorFirst = legs[0]?.role === "anchor" && legs[1]?.role === "anchor" ? 30 : legs[0]?.role === "anchor" ? 15 : 0;
  const pressureLast = legs[legs.length - 1]?.role === "pressure" ? 20 : 0;
  const legCount = Math.min(legs.length * 2, 10);
  return Math.min(100, structureScore + anchorFirst + pressureLast + legCount);
}

// ─── Strategy Definitions ─────────────────────────────────────────────────────

const STRATEGIES = [
  {
    id: "sweat",
    name: "Sportsbook Sweat™",
    icon: "🔥",
    color: "#f97316",
    darkBg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.25)",
    tagline: "Make the sportsbook pay you before the ticket finishes",
    how: `Stack 2–3 heavy favorites as your first legs. The book watches their liability grow as each anchor wins. By the time you reach your volatile "pressure leg," the cashout offer jumps well above your stake — and you take it. Your friend's exact system.`,
    rules: [
      "Open with 2 anchor legs (odds between -200 and -130)",
      "Add 1–2 pressure legs as the final picks (+120 to +250)",
      "Target cashout after both anchors win — book is sweating the underdogs",
      "Exit when cashout ROI is 40–80% of your stake",
    ],
    badge: "Your Friend's Method",
    badgeColor: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  },
  {
    id: "lock",
    name: "Lock & Roll™",
    icon: "🔒",
    color: "#34d399",
    darkBg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    tagline: "Guarantee no-loss with progressive partial cashouts at each leg",
    how: `Take a partial cashout as each leg hits — banking a portion of the growing value while letting the rest ride. You can never lose money. The house's nervousness works for you at every single stage, not just the end.`,
    rules: [
      "After leg 1 hits: Take 30% partial cashout (cover partial stake)",
      "After leg 2 hits: Take 25% more (now guaranteed break-even or better)",
      "After leg 3 hits: Let remaining 45% ride — all upside, zero downside",
      "Final leg: Pure profit regardless of outcome",
    ],
    badge: "Zero Downside",
    badgeColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  },
  {
    id: "steam",
    name: "Steam Exit™",
    icon: "💨",
    color: "#a78bfa",
    darkBg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.25)",
    tagline: "Build on steam picks — cash out when the line moves your way",
    how: `Pick games where sharp money is already moving the line. When 1–2 early legs win AND your remaining legs have moved in your favor (line movement = closing line value), the fair value of your cashout surpasses what the book charges you. You're profiting from information asymmetry.`,
    rules: [
      "Only use picks where the line has already moved in your favor",
      "Monitor line movement on remaining legs during the game",
      "When remaining legs' lines move 5+ points your way = exit",
      "You capture 'closing line value' profit without needing the ticket to win",
    ],
    badge: "CLV Play",
    badgeColor: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StrategyCard({ strategy, isActive, onSelect }: { strategy: typeof STRATEGIES[0]; isActive: boolean; onSelect: () => void }) {
  return (
    <div
      className="rounded-2xl p-4 border cursor-pointer transition-all duration-200"
      style={{
        background: isActive ? strategy.darkBg : "rgba(255,255,255,0.025)",
        borderColor: isActive ? strategy.border : "rgba(255,255,255,0.07)",
        boxShadow: isActive ? `0 0 24px ${strategy.color}18` : "none",
      }}
      onClick={onSelect}
      data-testid={`strategy-card-${strategy.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[22px] leading-none">{strategy.icon}</span>
          <div>
            <p className="text-[13px] font-black" style={{ color: isActive ? strategy.color : "rgba(255,255,255,0.80)" }}>{strategy.name}</p>
            <Badge variant="outline" className={`text-[8px] font-bold mt-0.5 ${strategy.badgeColor}`}>{strategy.badge}</Badge>
          </div>
        </div>
        {isActive && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: strategy.color }} />}
      </div>
      <p className="text-[10px] font-semibold mb-2" style={{ color: `${strategy.color}CC` }}>{strategy.tagline}</p>
      <p className="text-[9px] text-white/45 leading-relaxed line-clamp-3">{strategy.how}</p>
    </div>
  );
}

function LadderStepRow({ step, stake, totalLegs }: { step: LadderStep; stake: number; totalLegs: number }) {
  const isLast = step.legIndex === totalLegs - 1;
  const color = step.isOptimalExit ? "#34d399" : step.isSweetSpot ? "#fbbf24" : step.isBreakeven ? "#60a5fa" : "rgba(255,255,255,0.35)";
  const statusLabel = isLast ? "FULL WIN" : step.isOptimalExit ? "OPTIMAL EXIT" : step.isSweetSpot ? "SWEET SPOT" : step.isBreakeven ? "BREAK-EVEN" : "WAIT";

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
      style={{
        background: step.isOptimalExit ? "rgba(52,211,153,0.08)" : step.isSweetSpot ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
        borderColor: step.isOptimalExit ? "rgba(52,211,153,0.22)" : step.isSweetSpot ? "rgba(251,191,36,0.20)" : "rgba(255,255,255,0.06)",
      }}
      data-testid={`ladder-step-${step.legIndex}`}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
        style={{ background: `${color}20`, border: `2px solid ${color}50`, color }}
      >
        {step.legIndex + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-bold text-white/80 truncate">{step.label}</span>
          <span
            className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ background: step.role === "anchor" ? "rgba(52,211,153,0.15)" : "rgba(249,115,22,0.15)", color: step.role === "anchor" ? "#34d399" : "#f97316" }}
          >
            {step.role}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[8px] text-white/30">
          <span>{step.cumulativeMultiplier.toFixed(2)}x running</span>
          <span>·</span>
          <span>Sweat {step.sweatScore}/100</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[14px] font-black tabular-nums" style={{ color }}>${step.estimatedCashout.toFixed(0)}</p>
        <p className="text-[8px] font-bold" style={{ color: `${color}90` }}>
          {step.cashoutROI >= 0 ? "+" : ""}{step.cashoutROI.toFixed(0)}% ROI
        </p>
        <Badge
          variant="outline"
          className="text-[7px] mt-0.5 px-1 py-0 hidden sm:block"
          style={{ borderColor: `${color}40`, color: `${color}CC`, background: `${color}10` }}
        >
          {statusLabel}
        </Badge>
      </div>

      {!isLast && (
        <ArrowDown className="w-3 h-3 text-white/15 shrink-0 hidden sm:block" />
      )}
      {isLast && (
        <Trophy className="w-4 h-4 shrink-0" style={{ color: "#fbbf24" }} />
      )}
    </div>
  );
}

// ─── Sweat Builder ─────────────────────────────────────────────────────────────

function SweatBuilder() {
  const [stake, setStake] = useState(100);
  const [legs, setLegs] = useState<SweatLeg[]>([
    { id: "1", label: "Team A Moneyline", americanOdds: -160, role: "anchor" },
    { id: "2", label: "Team B Moneyline", americanOdds: -140, role: "anchor" },
    { id: "3", label: "Underdog ML", americanOdds: 190, role: "pressure" },
  ]);
  const [newLabel, setNewLabel] = useState("");
  const [newOdds, setNewOdds] = useState<string>("-110");
  const [newRole, setNewRole] = useState<"anchor" | "pressure">("anchor");

  const ladder = useMemo(() => calcLadder(legs, stake), [legs, stake]);
  const overallSweat = useMemo(() => calcSweatScore(legs), [legs]);
  const fullPayout = legs.reduce((acc, l) => acc * americanToDecimal(l.americanOdds), stake);
  const optimalStep = ladder.find(s => s.isOptimalExit || s.isSweetSpot);
  const breakEvenStep = ladder.find(s => s.estimatedCashout >= stake);

  function addLeg() {
    const parsed = parseInt(newOdds);
    if (isNaN(parsed)) return;
    setLegs(prev => [...prev, {
      id: Date.now().toString(),
      label: newLabel || `Leg ${prev.length + 1}`,
      americanOdds: parsed,
      role: newRole,
    }]);
    setNewLabel("");
    setNewOdds("-110");
  }

  function removeLeg(id: string) {
    setLegs(prev => prev.filter(l => l.id !== id));
  }

  function moveLeg(id: string, dir: -1 | 1) {
    setLegs(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }

  const sweatColor = overallSweat >= 70 ? "#f97316" : overallSweat >= 40 ? "#fbbf24" : "#60a5fa";

  return (
    <div className="space-y-5">

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[14px] font-black text-white/90">Sweat Builder™</h3>
          <p className="text-[9px] text-white/40 mt-0.5">Build your ticket for maximum cashout pressure</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
          style={{ background: `${sweatColor}12`, borderColor: `${sweatColor}35` }}
        >
          <Flame className="w-3.5 h-3.5" style={{ color: sweatColor }} />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: sweatColor }}>
            Sweat Score: {overallSweat}/100
          </span>
        </div>
      </div>

      {/* Sweat score explanation */}
      <div className="rounded-xl px-4 py-3 border" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overallSweat}%`, background: `linear-gradient(90deg, #3b82f6, ${sweatColor})` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-white/30 font-bold uppercase">
          <span>Low pressure</span>
          <span>Break-even cashout zone</span>
          <span>Sportsbook sweating</span>
        </div>
        <p className="text-[9px] text-white/45 mt-2 leading-relaxed">
          {overallSweat >= 70 ? "Perfect structure. The book will be nervous. Your cashout offers will be generous — this is exactly how your friend does it." :
            overallSweat >= 40 ? "Good foundation. Add more anchor legs first and move pressure legs to the end to maximize the sweat effect." :
            "Needs work. Front-load heavy favorites and add at least one volatile underdog at the end."}
        </p>
      </div>

      {/* Stake input */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 shrink-0">Stake</label>
        <div className="flex gap-1.5">
          {[50, 100, 200, 500].map(v => (
            <button
              key={v}
              onClick={() => setStake(v)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all"
              style={{
                background: stake === v ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                borderColor: stake === v ? "rgba(52,211,153,0.40)" : "rgba(255,255,255,0.08)",
                color: stake === v ? "#34d399" : "rgba(255,255,255,0.45)",
              }}
              data-testid={`stake-btn-${v}`}
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Leg list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Ticket Structure</span>
          <span className="text-[9px] text-white/25">Drag order matters — anchors first</span>
        </div>
        {legs.map((leg, idx) => (
          <div
            key={leg.id}
            className="flex items-center gap-2 rounded-xl px-3 py-2 border group"
            style={{
              background: leg.role === "anchor" ? "rgba(52,211,153,0.05)" : "rgba(249,115,22,0.05)",
              borderColor: leg.role === "anchor" ? "rgba(52,211,153,0.18)" : "rgba(249,115,22,0.18)",
            }}
            data-testid={`leg-item-${leg.id}`}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: leg.role === "anchor" ? "rgba(52,211,153,0.20)" : "rgba(249,115,22,0.20)", color: leg.role === "anchor" ? "#34d399" : "#f97316" }}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white/80 truncate">{leg.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[9px] font-black"
                  style={{ color: leg.americanOdds > 0 ? "#f97316" : "#34d399" }}
                >
                  {leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}
                </span>
                <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: leg.role === "anchor" ? "rgba(52,211,153,0.12)" : "rgba(249,115,22,0.12)", color: leg.role === "anchor" ? "#34d399" : "#f97316" }}>
                  {leg.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {idx > 0 && (
                <button onClick={() => moveLeg(leg.id, -1)} className="p-1 rounded text-white/40 hover:text-white/70" title="Move up">
                  <ChevronRight className="w-3 h-3 -rotate-90" />
                </button>
              )}
              {idx < legs.length - 1 && (
                <button onClick={() => moveLeg(leg.id, 1)} className="p-1 rounded text-white/40 hover:text-white/70" title="Move down">
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
              )}
              <button
                onClick={() => removeLeg(leg.id)}
                className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                data-testid={`remove-leg-${leg.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Add leg */}
        <div className="rounded-xl px-3 py-2.5 border border-dashed border-white/10" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["anchor", "pressure"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setNewRole(r)}
                  className="px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all"
                  style={{
                    background: newRole === r ? (r === "anchor" ? "rgba(52,211,153,0.15)" : "rgba(249,115,22,0.15)") : "transparent",
                    borderColor: newRole === r ? (r === "anchor" ? "rgba(52,211,153,0.35)" : "rgba(249,115,22,0.35)") : "rgba(255,255,255,0.08)",
                    color: newRole === r ? (r === "anchor" ? "#34d399" : "#f97316") : "rgba(255,255,255,0.30)",
                  }}
                  data-testid={`role-btn-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Pick label (optional)"
              className="h-8 text-[11px] flex-1 min-w-[120px] bg-white/5 border-white/10"
              data-testid="input-leg-label"
            />
            <Input
              value={newOdds}
              onChange={e => setNewOdds(e.target.value)}
              placeholder="Odds e.g. -160"
              className="h-8 text-[11px] w-[90px] bg-white/5 border-white/10 font-mono"
              data-testid="input-leg-odds"
            />
            <Button
              size="sm"
              className="h-8 gap-1 px-3"
              onClick={addLeg}
              data-testid="button-add-leg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Cashout Ladder */}
      {legs.length >= 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-white/50">Cashout Ladder</h4>
            <div className="flex items-center gap-3 text-[8px] text-white/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Break-even</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Sweet Spot</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Optimal Exit</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Stake",
                value: `$${stake}`,
                sub: "your risk",
                color: "rgba(255,255,255,0.45)",
              },
              {
                label: breakEvenStep ? `After Leg ${breakEvenStep.legIndex + 1}` : "No break-even",
                value: breakEvenStep ? `$${breakEvenStep.estimatedCashout.toFixed(0)}` : "Hold",
                sub: "break-even cashout",
                color: "#60a5fa",
              },
              {
                label: "Full Win",
                value: `$${Math.round(fullPayout)}`,
                sub: "if all legs hit",
                color: "#fbbf24",
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="rounded-xl px-2 py-2.5 text-center border border-white/06" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[7px] font-bold uppercase tracking-wider text-white/28">{label}</p>
                <p className="text-[18px] font-black tabular-nums leading-tight mt-0.5" style={{ color, fontFamily: "Georgia, serif" }}>{value}</p>
                <p className="text-[7px] text-white/22 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {ladder.map(step => (
              <LadderStepRow key={step.legIndex} step={step} stake={stake} totalLegs={legs.length} />
            ))}
          </div>

          {optimalStep && (
            <div
              className="rounded-xl px-4 py-3 border"
              style={{ background: "rgba(52,211,153,0.07)", borderColor: "rgba(52,211,153,0.25)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wide">Recommended Cashout Point</span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                After <strong className="text-white/85">leg {optimalStep.legIndex + 1} ({optimalStep.label})</strong> wins,
                cash out for approximately <strong className="text-emerald-400">${optimalStep.estimatedCashout.toFixed(0)}</strong> —
                a <strong className="text-emerald-400">+{optimalStep.cashoutROI.toFixed(0)}% return</strong> on your ${stake} stake.
                The sportsbook is at peak nervousness ({optimalStep.sweatScore}/100 sweat score).
                This is exactly when your friend pulls the trigger.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rules Guide ──────────────────────────────────────────────────────────────

function StrategyRulesGuide({ strategy }: { strategy: typeof STRATEGIES[0] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 border" style={{ background: strategy.darkBg, borderColor: strategy.border }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[20px]">{strategy.icon}</span>
          <div>
            <p className="text-[13px] font-black" style={{ color: strategy.color }}>{strategy.name}</p>
            <p className="text-[9px]" style={{ color: `${strategy.color}80` }}>{strategy.tagline}</p>
          </div>
        </div>
        <p className="text-[9px] text-white/55 leading-relaxed">{strategy.how}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/35">The 4 Rules</p>
        {strategy.rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2 border border-white/06" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black mt-0.5"
              style={{ background: `${strategy.color}18`, color: strategy.color }}
            >
              {i + 1}
            </div>
            <p className="text-[10px] text-white/65 leading-snug">{rule}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl px-4 py-3 border border-white/06" style={{ background: "rgba(255,255,255,0.025)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Info className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[9px] font-black uppercase tracking-wider text-white/30">Why This Works</span>
        </div>
        <p className="text-[9px] text-white/45 leading-relaxed">
          Sportsbooks calculate cashout values using their own probability models, which often underestimate the true likelihood of remaining legs. When your early favorites win, the book has growing financial exposure — they're incentivized to offer you a cashout that seems generous but still gives them margin. A well-structured ticket exploits this dynamic: you take the cashout at their most nervous moment, which is consistently their most generous offer.
        </p>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CashoutStrategiesEngine() {
  const [activeStrategy, setActiveStrategy] = useState("sweat");
  const activeStrategyData = STRATEGIES.find(s => s.id === activeStrategy) ?? STRATEGIES[0];

  return (
    <div className="space-y-5">

      {/* Top header */}
      <div
        className="rounded-2xl px-5 py-4 border"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(0,0,0,0.40) 100%)", borderColor: "rgba(249,115,22,0.22)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-[15px] font-black text-white/90">Cashout Engineering™</h2>
              <Badge variant="outline" className="text-[8px] text-orange-400 border-orange-400/30 bg-orange-400/10">Pro Strategy</Badge>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed max-w-[520px]">
              Stop building tickets hoping all legs win. Build tickets that force the sportsbook to pay you whether they win or not. Structure your parlay so the book gets nervous at exactly the moment you want to cash out.
            </p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[28px] font-black text-orange-400" style={{ fontFamily: "Georgia, serif", textShadow: "0 0 20px rgba(249,115,22,0.40)" }}>💰</p>
          </div>
        </div>
      </div>

      {/* Strategy selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {STRATEGIES.map(s => (
          <StrategyCard
            key={s.id}
            strategy={s}
            isActive={activeStrategy === s.id}
            onSelect={() => setActiveStrategy(s.id)}
          />
        ))}
      </div>

      {/* Inner tabs: Builder vs Guide */}
      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="builder" className="gap-1.5 text-[11px]" data-testid="tab-builder">
            <BarChart2 className="w-3.5 h-3.5" />
            Build & Simulate
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1.5 text-[11px]" data-testid="tab-guide">
            <Info className="w-3.5 h-3.5" />
            Strategy Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <SweatBuilder />
        </TabsContent>

        <TabsContent value="guide">
          <StrategyRulesGuide strategy={activeStrategyData} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
