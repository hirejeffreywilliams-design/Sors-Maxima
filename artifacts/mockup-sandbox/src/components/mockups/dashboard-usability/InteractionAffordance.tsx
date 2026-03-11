import "./_group.css";
import { Lock, Zap, TrendingUp, ChevronDown, Plus, ShoppingCart, Filter, RefreshCw, Info } from "lucide-react";
import { useState } from "react";

const picks = [
  {
    id: 1, tier: "LOCK", sport: "NBA", betType: "Spread", pick: "Boston Celtics -4.5",
    game: "BOS @ MIA · Tonight 7:30 PM", odds: -110, confidence: 79, edge: 5.2,
    trueProb: 63, units: 2.5, sharpMoney: 72, modelAgreement: 5, steamMove: true,
  },
  {
    id: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline", pick: "Kansas City Chiefs ML",
    game: "KC @ LV · Tonight 8:15 PM", odds: -145, confidence: 71, edge: 3.8,
    trueProb: 68, units: 2.0, sharpMoney: 61, modelAgreement: 4, steamMove: false,
  },
  {
    id: 3, tier: "STRONG", sport: "NHL", betType: "Total", pick: "Rangers/Penguins Over 6",
    game: "NYR @ PIT · Tonight 7:00 PM", odds: -108, confidence: 67, edge: 2.9,
    trueProb: 58, units: 1.5, sharpMoney: 55, modelAgreement: 4, steamMove: false,
  },
  {
    id: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline", pick: "Houston Astros ML",
    game: "HOU @ TEX · Tonight 8:05 PM", odds: 115, confidence: 58, edge: 1.4,
    trueProb: 53, units: 1.0, sharpMoney: 48, modelAgreement: 3, steamMove: false,
  },
];

const tierConfig: Record<string, { bg: string; text: string; icon: any }> = {
  LOCK:   { bg: "bg-emerald-100 text-emerald-800", text: "text-emerald-700", icon: Lock },
  STRONG: { bg: "bg-blue-100 text-blue-800",       text: "text-blue-700",    icon: Zap },
  LEAN:   { bg: "bg-amber-100 text-amber-800",     text: "text-amber-700",   icon: TrendingUp },
};

function formatOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function Tooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-44 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 leading-relaxed shadow-xl">
          {tip}
        </span>
      )}
    </span>
  );
}

function MetricCell({ label, value, tip, color = "text-gray-900" }: { label: string; value: string; tip: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <Tooltip tip={tip}>
          <Info className="w-3 h-3 text-gray-300 cursor-help hover:text-gray-500 transition-colors" />
        </Tooltip>
      </div>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  );
}

function PickCard({ pick, slipCount, onAdd, inSlip }: { pick: typeof picks[0]; slipCount: number; onAdd: () => void; inSlip: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const tier = tierConfig[pick.tier];
  const TierIcon = tier.icon;
  return (
    <div className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${inSlip ? "border-emerald-500" : "border-gray-100 hover:border-gray-200"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tier.bg}`}>
                <TierIcon className="w-3 h-3" />
                {pick.tier}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pick.sport}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{pick.betType}</span>
              {pick.steamMove && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">🔥 Steam</span>}
            </div>
            <p className="font-bold text-gray-900">{pick.pick}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pick.game}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-gray-900">{formatOdds(pick.odds)}</p>
            <p className="text-xs text-gray-400">{pick.units}u recommended</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <MetricCell
            label="Confidence"
            value={`${pick.confidence}%`}
            tip="How confident the model is in this pick. Above 65% is strong."
            color={pick.confidence >= 70 ? "text-emerald-600" : "text-gray-900"}
          />
          <MetricCell
            label="Edge"
            value={`+${pick.edge}%`}
            tip="Your expected value advantage over the sportsbook. Positive = long-term value."
            color="text-emerald-600"
          />
          <MetricCell
            label="True Prob"
            value={`${pick.trueProb}%`}
            tip="Model's true estimated probability, with vig removed."
          />
          <MetricCell
            label="Sharp $"
            value={`${pick.sharpMoney}%`}
            tip="% of professional money on this side. >60% = strong sharp consensus."
            color={pick.sharpMoney >= 60 ? "text-blue-600" : "text-gray-900"}
          />
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide details" : "Show analysis details"}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Models agreeing</span><span className="font-bold">{pick.modelAgreement}/5</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Implied prob</span><span className="font-bold">{Math.round(100 / (1 + 100 / Math.abs(pick.odds)))}%</span></div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onAdd}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            inSlip
              ? "bg-emerald-500 text-white cursor-default"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-md shadow-emerald-100"
          }`}
        >
          {inSlip ? (
            <><ShoppingCart className="w-4 h-4" /> In Slip</>
          ) : (
            <><Plus className="w-4 h-4" /> Add to Parlay Slip</>
          )}
        </button>
      </div>
    </div>
  );
}

export function InteractionAffordance() {
  const [slip, setSlip] = useState<number[]>([]);
  const [activeSport, setActiveSport] = useState("All");
  const sports = ["All", "NBA", "NFL", "NHL", "MLB"];

  const visible = activeSport === "All" ? picks : picks.filter((p) => p.sport === activeSport);

  return (
    <div className="min-h-screen bg-gray-50 p-5" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Today's Picks</h1>
          <p className="text-xs text-gray-400">Tap a pick · Add to your slip</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-700">Filters</span>
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {sports.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSport(s)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSport === s
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-4">
        {visible.map((pick) => (
          <PickCard
            key={pick.id}
            pick={pick}
            slipCount={slip.length}
            onAdd={() => setSlip((s) => s.includes(pick.id) ? s : [...s, pick.id])}
            inSlip={slip.includes(pick.id)}
          />
        ))}
      </div>

      {slip.length > 0 && (
        <div className="fixed bottom-5 left-5 right-5">
          <button className="w-full flex items-center justify-between bg-emerald-600 text-white px-5 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Parlay Slip · {slip.length} leg{slip.length > 1 ? "s" : ""}</span>
            </div>
            <span className="bg-white text-emerald-700 text-xs px-3 py-1 rounded-full font-bold">View →</span>
          </button>
        </div>
      )}
    </div>
  );
}
