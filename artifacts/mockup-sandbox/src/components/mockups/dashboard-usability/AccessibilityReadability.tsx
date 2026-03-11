import "./_group.css";
import { Lock, Zap, TrendingUp, Plus, CheckCircle, AlertTriangle, BookOpen } from "lucide-react";
import { useState } from "react";

const picks = [
  {
    id: 1, tier: "LOCK", sport: "NBA", betType: "Spread", pick: "Boston Celtics -4.5",
    game: "Boston Celtics vs Miami Heat · Tonight at 7:30 PM ET",
    odds: -110, confidence: 79, edge: 5.2, trueProb: 63, units: 2.5,
    summary: "Strong sharp money consensus with steam move. 5 of 5 models agree. High edge over closing line.",
    steamMove: true,
  },
  {
    id: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline", pick: "Kansas City Chiefs ML",
    game: "Kansas City Chiefs at Las Vegas Raiders · Tonight at 8:15 PM ET",
    odds: -145, confidence: 71, edge: 3.8, trueProb: 68, units: 2.0,
    summary: "Reverse line movement detected. 4 of 5 models in agreement. Solid closing line value.",
    steamMove: false,
  },
  {
    id: 3, tier: "STRONG", sport: "NHL", betType: "Total (Over/Under)", pick: "Rangers / Penguins Over 6",
    game: "New York Rangers vs Pittsburgh Penguins · Tonight at 7:00 PM ET",
    odds: -108, confidence: 67, edge: 2.9, trueProb: 58, units: 1.5,
    summary: "Both offenses running hot this week. No significant line movement. Mid-range edge.",
    steamMove: false,
  },
  {
    id: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline", pick: "Houston Astros ML",
    game: "Houston Astros at Texas Rangers · Tonight at 8:05 PM ET",
    odds: 115, confidence: 58, edge: 1.4, trueProb: 53, units: 1.0,
    summary: "Slight model edge. Lower certainty — only 3 of 5 models agree. Use small stake.",
    steamMove: false,
  },
];

const tierConfig: Record<string, { icon: any; bg: string; text: string; border: string; label: string; description: string }> = {
  LOCK: {
    icon: Lock,
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    label: "Lock",
    description: "Highest confidence",
  },
  STRONG: {
    icon: Zap,
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-300",
    label: "Strong",
    description: "High confidence",
  },
  LEAN: {
    icon: TrendingUp,
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    label: "Lean",
    description: "Moderate confidence",
  },
};

function formatOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

function PickCard({ pick, onAdd, inSlip }: { pick: typeof picks[0]; onAdd: () => void; inSlip: boolean }) {
  const tier = tierConfig[pick.tier];
  const TierIcon = tier.icon;
  return (
    <article
      className={`bg-white border-2 rounded-2xl overflow-hidden ${inSlip ? "border-emerald-400" : tier.border}`}
      aria-label={`${pick.tier} pick: ${pick.pick}`}
    >
      <div className={`px-5 py-3 ${tier.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <TierIcon className={`w-5 h-5 ${tier.text}`} aria-hidden="true" />
          <span className={`text-base font-bold ${tier.text}`}>{tier.label}</span>
          <span className={`text-sm ${tier.text} opacity-70`}>· {tier.description}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${tier.text} bg-white/60 px-2 py-0.5 rounded-full`}>{pick.sport}</span>
          <span className={`text-xs font-semibold ${tier.text} bg-white/60 px-2 py-0.5 rounded-full`}>{pick.betType}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{pick.pick}</h2>
            <p className="text-sm text-gray-500 mt-1">{pick.game}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-gray-900">{formatOdds(pick.odds)}</p>
            <p className="text-xs text-gray-400">Odds</p>
          </div>
        </div>

        {pick.steamMove && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800"><strong>Steam move detected</strong> — sharp money moved this line rapidly across multiple sportsbooks.</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Model Confidence</span>
              <span className="font-bold text-gray-900">{pick.confidence}%</span>
            </div>
            <ProgressBar value={pick.confidence} color="bg-emerald-500" />
            <p className="text-xs text-gray-400">How confident the 46-factor model is in this outcome</p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Expected Value Edge</span>
              <span className={`font-bold ${pick.edge > 3 ? "text-emerald-700" : "text-blue-700"}`}>+{pick.edge}%</span>
            </div>
            <ProgressBar value={Math.min(pick.edge * 10, 100)} color={pick.edge > 3 ? "bg-emerald-500" : "bg-blue-500"} />
            <p className="text-xs text-gray-400">Your long-term advantage over the sportsbook's offered odds</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-0.5">True Probability</p>
            <p className="text-lg font-bold text-gray-900">{pick.trueProb}%</p>
            <p className="text-xs text-gray-400">Estimated real chance of winning</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Recommended Stake</p>
            <p className="text-lg font-bold text-gray-900">{pick.units} unit{pick.units !== 1 ? "s" : ""}</p>
            <p className="text-xs text-gray-400">Based on Kelly Criterion sizing</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-gray-600">{pick.summary}</p>
        </div>

        <button
          onClick={onAdd}
          disabled={inSlip}
          className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300 ${
            inSlip
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white"
          }`}
          aria-label={inSlip ? `${pick.pick} is already in your slip` : `Add ${pick.pick} to your parlay slip`}
        >
          {inSlip ? (
            <><CheckCircle className="w-5 h-5" aria-hidden="true" /> Added to Slip</>
          ) : (
            <><Plus className="w-5 h-5" aria-hidden="true" /> Add to Parlay Slip</>
          )}
        </button>
      </div>
    </article>
  );
}

export function AccessibilityReadability() {
  const [slip, setSlip] = useState<number[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-5 space-y-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Today's Best Picks</h1>
        <p className="text-base text-gray-500 mt-1">
          {picks.length} picks · Sorted by confidence from highest to lowest
        </p>
      </header>

      <div role="status" aria-live="polite" className="sr-only">
        {slip.length > 0 ? `${slip.length} pick${slip.length > 1 ? "s" : ""} in your parlay slip` : "Parlay slip is empty"}
      </div>

      <nav aria-label="Filter by sport" className="flex gap-2 overflow-x-auto pb-1">
        {["All Sports", "NBA", "NFL", "NHL", "MLB"].map((s, i) => (
          <button
            key={s}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300 ${
              i === 0
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </nav>

      <main className="space-y-4" role="list" aria-label="Today's picks">
        {picks.map((pick) => (
          <div key={pick.id} role="listitem">
            <PickCard
              pick={pick}
              onAdd={() => setSlip((s) => s.includes(pick.id) ? s : [...s, pick.id])}
              inSlip={slip.includes(pick.id)}
            />
          </div>
        ))}
      </main>

      {slip.length > 0 && (
        <footer className="sticky bottom-0 pb-5 pt-2">
          <button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-between px-5 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            aria-label={`View parlay slip with ${slip.length} picks`}
          >
            <span>View Parlay Slip</span>
            <span className="bg-white text-emerald-700 font-bold text-sm px-3 py-1 rounded-full">
              {slip.length} pick{slip.length > 1 ? "s" : ""}
            </span>
          </button>
        </footer>
      )}
    </div>
  );
}
