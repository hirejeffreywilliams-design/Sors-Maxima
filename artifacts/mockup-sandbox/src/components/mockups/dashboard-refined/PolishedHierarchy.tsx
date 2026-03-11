import "../dashboard-usability/_group.css";
import { useState } from "react";
import { Lock, Zap, TrendingUp, ChevronDown, ChevronUp, Plus, ShoppingCart, Flame, Eye, BarChart3, Sparkles, Shuffle, Wrench } from "lucide-react";

const picks = [
  {
    id: 1, rank: 1, tier: "LOCK", sport: "NBA", betType: "Spread",
    pick: "Boston Celtics -4.5", game: "BOS @ MIA", time: "7:30 PM",
    odds: -110, fusionGrade: "A+", confidence: 79, edge: 5.2,
    trueProb: 63, units: 2.5, sharpMoney: 72, modelAgreement: 5,
    steamMove: true, reverseLineMove: false,
    projectedLine: "-3.5", fairLine: "-5.5", impliedProb: 52,
  },
  {
    id: 2, rank: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline",
    pick: "Kansas City Chiefs ML", game: "KC @ LV", time: "8:15 PM",
    odds: -145, fusionGrade: "B+", confidence: 71, edge: 3.8,
    trueProb: 68, units: 2.0, sharpMoney: 61, modelAgreement: 4,
    steamMove: false, reverseLineMove: true,
    projectedLine: "-130", fairLine: "-155", impliedProb: 59,
  },
  {
    id: 3, rank: 3, tier: "STRONG", sport: "NHL", betType: "Total",
    pick: "Rangers / Penguins Over 6", game: "NYR @ PIT", time: "7:00 PM",
    odds: -108, fusionGrade: "B", confidence: 67, edge: 2.9,
    trueProb: 58, units: 1.5, sharpMoney: 55, modelAgreement: 4,
    steamMove: false, reverseLineMove: false,
    projectedLine: "O5.5", fairLine: "O6.5", impliedProb: 52,
  },
  {
    id: 4, rank: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline",
    pick: "Houston Astros ML", game: "HOU @ TEX", time: "8:05 PM",
    odds: 115, fusionGrade: "C+", confidence: 58, edge: 1.4,
    trueProb: 53, units: 1.0, sharpMoney: 48, modelAgreement: 3,
    steamMove: false, reverseLineMove: false,
    projectedLine: "+120", fairLine: "+110", impliedProb: 47,
  },
];

const tier = {
  LOCK:   { icon: Lock,       bg: "bg-emerald-500", accent: "border-l-emerald-500", label: "Lock",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  STRONG: { icon: Zap,        bg: "bg-blue-500",    accent: "border-l-blue-500",    label: "Strong", chip: "bg-blue-50 text-blue-700 border-blue-200" },
  LEAN:   { icon: TrendingUp, bg: "bg-amber-500",   accent: "border-l-amber-400",   label: "Lean",   chip: "bg-amber-50 text-amber-700 border-amber-200" },
};

function fmt(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function metricQuality(key: string, value: number) {
  if (key === "confidence") {
    if (value >= 70) return "bg-emerald-50 text-emerald-700";
    if (value >= 60) return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
  }
  if (key === "edge") {
    if (value >= 4) return "bg-emerald-50 text-emerald-700";
    if (value >= 2) return "bg-blue-50 text-blue-700";
    return "bg-gray-50 text-gray-700";
  }
  return "bg-gray-50 text-gray-700";
}

function MetricCell({ label, value, display, qKey }: { label: string; value: number; display: string; qKey: string }) {
  const q = metricQuality(qKey, value);
  return (
    <div className={`rounded-xl px-3 py-2.5 text-center ${q}`}>
      <p className="text-xs opacity-70 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-black">{display}</p>
    </div>
  );
}

function PickCard({ pick, inSlip, onAdd }: { pick: typeof picks[0]; inSlip: boolean; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = tier[pick.tier as keyof typeof tier];
  const TierIcon = t.icon;

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden border-l-4 ${t.accent} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${t.chip}`}>
                <TierIcon className="w-3 h-3" />
                {t.label}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pick.sport}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{pick.betType}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <p className="text-base font-bold text-gray-900 leading-tight">{pick.pick}</p>
              <p className="text-xl font-black text-gray-900 shrink-0">{fmt(pick.odds)}</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{pick.game} · {pick.time}</p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-bold text-gray-400">#{pick.rank}</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Grade {pick.fusionGrade}</span>
          </div>
        </div>

        {(pick.steamMove || pick.reverseLineMove) && (
          <div className="flex items-center gap-2 flex-wrap">
            {pick.steamMove && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <Flame className="w-3.5 h-3.5" />
                Steam Move
              </div>
            )}
            {pick.reverseLineMove && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                Reverse Line Move
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <MetricCell label="Confidence" value={pick.confidence} display={`${pick.confidence}%`} qKey="confidence" />
          <MetricCell label="Edge" value={pick.edge} display={`+${pick.edge}%`} qKey="edge" />
          <MetricCell label="True Prob" value={pick.trueProb} display={`${pick.trueProb}%`} qKey="trueProb" />
          <MetricCell label="Units" value={pick.units} display={`${pick.units}u`} qKey="units" />
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Sharp {pick.sharpMoney}%</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Models {pick.modelAgreement}/5</span>
          <button onClick={() => setExpanded(e => !e)} className="ml-auto flex items-center gap-1 hover:text-gray-700 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Less" : "Details"}
          </button>
        </div>

        {expanded && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-gray-400 mb-0.5">Projected Line</p><p className="font-semibold text-gray-800">{pick.projectedLine}</p></div>
            <div><p className="text-gray-400 mb-0.5">Fair Line</p><p className="font-semibold text-gray-800">{pick.fairLine}</p></div>
            <div><p className="text-gray-400 mb-0.5">Implied Prob</p><p className="font-semibold text-gray-800">{pick.impliedProb}%</p></div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onAdd}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            inSlip
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
              : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]"
          }`}
        >
          {inSlip ? <><ShoppingCart className="w-4 h-4" /> In Slip</> : <><Plus className="w-4 h-4" /> Add to Slip</>}
        </button>
      </div>
    </div>
  );
}

const tabs = [
  { id: "generator", label: "Generator", icon: Sparkles },
  { id: "straight",  label: "Straight",  icon: TrendingUp },
  { id: "sgp",       label: "SGP",        icon: Shuffle },
  { id: "builder",   label: "Builder",    icon: Wrench },
];

export function PolishedHierarchy() {
  const [slip, setSlip] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("straight");
  const [sportFilter, setSportFilter] = useState("All");
  const sports = ["All", "NBA", "NFL", "NHL", "MLB"];

  const visible = sportFilter === "All" ? picks : picks.filter(p => p.sport === sportFilter);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bet Builder</h1>
            <p className="text-xs text-gray-400">Build, analyze, and optimize your picks</p>
          </div>
          {slip.length > 0 && (
            <button className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl">
              <ShoppingCart className="w-3.5 h-3.5" />
              Slip · {slip.length}
            </button>
          )}
        </div>

        <div className="flex gap-0 border-b border-gray-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {sports.map(s => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sportFilter === s
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <select className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-gray-600">
            <option>All Types</option>
            <option>Spread</option>
            <option>Moneyline</option>
            <option>Total</option>
          </select>
        </div>

        <div className="space-y-3">
          {visible.map(pick => (
            <PickCard
              key={pick.id}
              pick={pick}
              inSlip={slip.includes(pick.id)}
              onAdd={() => setSlip(s => s.includes(pick.id) ? s : [...s, pick.id])}
            />
          ))}
        </div>

        <p className="text-xs text-center text-gray-300 pt-2">
          For analysis purposes only · Not a sportsbook · 21+ · Gamble responsibly
        </p>
      </div>
    </div>
  );
}
