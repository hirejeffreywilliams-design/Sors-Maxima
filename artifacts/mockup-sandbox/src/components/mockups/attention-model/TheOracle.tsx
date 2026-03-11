import "../dashboard-usability/_group.css";
import { useState } from "react";
import { Lock, Zap, TrendingUp, ChevronRight, Plus, X, Eye, BarChart3, Flame, ArrowRight, CheckCircle } from "lucide-react";

const picks = [
  {
    id: 1, tier: "LOCK", sport: "NBA", betType: "Spread", pick: "Boston Celtics -4.5",
    game: "BOS @ MIA", time: "Tonight · 7:30 PM ET",
    odds: -110, confidence: 79, edge: 5.2, trueProb: 63, units: 2.5,
    sharpMoney: 72, modelAgreement: 5, steamMove: true, reverseLineMove: false,
    rationale: "Five of five models agree. Sharp money at 72% moved the line from -3 to -4.5 — a steam move signal. The Celtics are 8-2 ATS in their last 10 as a road favorite. Miami missing two rotation players.",
    risk: "If Tatum is managed minutes, cover becomes tighter. Watch for late injury report.",
  },
  {
    id: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline", pick: "Kansas City Chiefs ML",
    game: "KC @ LV", time: "Tonight · 8:15 PM ET",
    odds: -145, confidence: 71, edge: 3.8, trueProb: 68, units: 2.0,
    sharpMoney: 61, modelAgreement: 4, steamMove: false, reverseLineMove: true,
    rationale: "Reverse line movement: public is 58% on Raiders but the line moved toward KC. Classic sharp-vs-public split. KC 6-1 ATS in division road games under Mahomes.",
    risk: "Price at -145 compresses value. Only play if you're comfortable with the implied probability at that juice.",
  },
  {
    id: 3, tier: "STRONG", sport: "NHL", betType: "Total", pick: "Rangers / Penguins Over 6",
    game: "NYR @ PIT", time: "Tonight · 7:00 PM ET",
    odds: -108, confidence: 67, edge: 2.9, trueProb: 58, units: 1.5,
    sharpMoney: 55, modelAgreement: 4, steamMove: false, reverseLineMove: false,
    rationale: "Both teams top-10 in goals scored last 14 days. Goaltenders both posting sub-.900 save percentages this week. Total opened at 5.5 — sharp money pushed it to 6 then 6.5.",
    risk: "A dominant goaltending performance by either team invalidates this quickly. Line is fair at -108.",
  },
  {
    id: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline", pick: "Houston Astros ML",
    game: "HOU @ TEX", time: "Tonight · 8:05 PM ET",
    odds: 115, confidence: 58, edge: 1.4, trueProb: 53, units: 1.0,
    sharpMoney: 48, modelAgreement: 3, steamMove: false, reverseLineMove: false,
    rationale: "Small model edge at plus-money. Astros' starter has a 2.14 ERA in his last 5 road starts. Value exists if the price holds at +115.",
    risk: "Three of five models are neutral or against. Lower conviction — keep stake small.",
  },
];

const tierConfig: Record<string, { icon: any; color: string; bg: string; ring: string; label: string }> = {
  LOCK:   { icon: Lock,        color: "text-emerald-600", bg: "bg-emerald-50",  ring: "ring-emerald-400", label: "Lock" },
  STRONG: { icon: Zap,         color: "text-blue-600",    bg: "bg-blue-50",     ring: "ring-blue-400",    label: "Strong" },
  LEAN:   { icon: TrendingUp,  color: "text-amber-600",   bg: "bg-amber-50",    ring: "ring-amber-400",   label: "Lean" },
};

function formatOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function Ring({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} stroke="#e5e7eb" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} stroke={color}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
}

export function TheOracle() {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, "add" | "skip">>({});
  const [showSummary, setShowSummary] = useState(false);

  const current = picks[index];
  const tier = current ? tierConfig[current.tier] : null;
  const TierIcon = tier?.icon;
  const remaining = picks.length - index;

  const decide = (choice: "add" | "skip") => {
    setDecisions((d) => ({ ...d, [current.id]: choice }));
    if (index + 1 >= picks.length) setShowSummary(true);
    else setIndex((i) => i + 1);
  };

  if (showSummary) {
    const added = picks.filter((p) => decisions[p.id] === "add");
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white" style={{ fontFamily: "Inter, sans-serif" }}>
        <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold mb-1">Slip built</h2>
        <p className="text-gray-400 mb-8">{added.length} of {picks.length} picks added</p>
        <div className="w-full max-w-sm space-y-2 mb-8">
          {picks.map((p) => (
            <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${decisions[p.id] === "add" ? "bg-emerald-900/50 border border-emerald-700" : "bg-gray-800/50 border border-gray-700"}`}>
              <span className="text-sm font-medium">{p.pick}</span>
              <span className={`text-xs font-bold ${decisions[p.id] === "add" ? "text-emerald-400" : "text-gray-500"}`}>{decisions[p.id] === "add" ? "IN" : "SKIP"}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setIndex(0); setDecisions({}); setShowSummary(false); }} className="text-sm text-gray-400 hover:text-white underline">
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex gap-1.5">
          {picks.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i < index ? "bg-emerald-500 w-6" : i === index ? "bg-white w-8" : "bg-gray-700 w-6"}`} />
          ))}
        </div>
        <span className="text-xs text-gray-500">{remaining} left</span>
      </div>

      <div className="flex-1 flex flex-col px-5 py-4 space-y-5">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tier!.bg} self-start`}>
          <TierIcon className={`w-4 h-4 ${tier!.color}`} />
          <span className={`text-sm font-bold ${tier!.color}`}>{tier!.label} · {current.sport} {current.betType}</span>
        </div>

        <div>
          <h1 className="text-3xl font-black text-white leading-tight">{current.pick}</h1>
          <p className="text-gray-400 text-sm mt-1">{current.game} · {current.time}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative flex items-center justify-center">
            <Ring pct={current.confidence} color="#10b981" size={72} />
            <div className="absolute text-center">
              <span className="text-lg font-black text-white">{current.confidence}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Model confidence</p>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-gray-500">Odds</p>
                <p className="text-xl font-black text-white">{formatOdds(current.odds)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Edge</p>
                <p className="text-xl font-black text-emerald-400">+{current.edge}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Units</p>
                <p className="text-xl font-black text-white">{current.units}u</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Sharp {current.sharpMoney}%</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Models {current.modelAgreement}/5</span>
          {current.steamMove && <span className="flex items-center gap-1 text-red-400"><Flame className="w-3.5 h-3.5" /> Steam move</span>}
        </div>

        <div className="bg-gray-800/60 rounded-2xl p-4 space-y-3 flex-1">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Why this pick</p>
            <p className="text-sm text-gray-200 leading-relaxed">{current.rationale}</p>
          </div>
          <div className="border-t border-gray-700/50 pt-3">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1.5">Watch out for</p>
            <p className="text-sm text-gray-400 leading-relaxed">{current.risk}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 flex gap-3">
        <button
          onClick={() => decide("skip")}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-gray-700 text-gray-400 font-bold text-sm hover:border-gray-500 hover:text-white transition-all active:scale-95"
        >
          <X className="w-5 h-5" /> Skip
        </button>
        <button
          onClick={() => decide("add")}
          className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add to Slip <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
