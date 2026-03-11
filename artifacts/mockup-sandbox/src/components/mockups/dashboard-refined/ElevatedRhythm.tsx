import "../dashboard-usability/_group.css";
import { useState } from "react";
import { Lock, Zap, TrendingUp, ChevronDown, ChevronUp, Plus, ShoppingCart, Flame, Eye, BarChart3, Sparkles, Shuffle, Wrench, AlertTriangle } from "lucide-react";

const picks = [
  {
    id: 1, rank: 1, tier: "LOCK", sport: "NBA", betType: "Spread",
    pick: "Boston Celtics -4.5", game: "BOS @ MIA", time: "7:30 PM",
    odds: -110, fusionGrade: "A+", confidence: 79, edge: 5.2,
    trueProb: 63, units: 2.5, sharpMoney: 72, modelAgreement: 5,
    steamMove: true, reverseLineMove: false,
  },
  {
    id: 2, rank: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline",
    pick: "Kansas City Chiefs ML", game: "KC @ LV", time: "8:15 PM",
    odds: -145, fusionGrade: "B+", confidence: 71, edge: 3.8,
    trueProb: 68, units: 2.0, sharpMoney: 61, modelAgreement: 4,
    steamMove: false, reverseLineMove: true,
  },
  {
    id: 3, rank: 3, tier: "STRONG", sport: "NHL", betType: "Total",
    pick: "Rangers / Penguins Over 6", game: "NYR @ PIT", time: "7:00 PM",
    odds: -108, fusionGrade: "B", confidence: 67, edge: 2.9,
    trueProb: 58, units: 1.5, sharpMoney: 55, modelAgreement: 4,
    steamMove: false, reverseLineMove: false,
  },
  {
    id: 4, rank: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline",
    pick: "Houston Astros ML", game: "HOU @ TEX", time: "8:05 PM",
    odds: 115, fusionGrade: "C+", confidence: 58, edge: 1.4,
    trueProb: 53, units: 1.0, sharpMoney: 48, modelAgreement: 3,
    steamMove: false, reverseLineMove: false,
  },
];

const tierDef = {
  LOCK:   { icon: Lock,       border: "border-l-emerald-500", labelBg: "bg-emerald-500", name: "LOCK",   textColor: "text-emerald-700", ringColor: "#10b981" },
  STRONG: { icon: Zap,        border: "border-l-blue-400",    labelBg: "bg-blue-500",    name: "STRONG", textColor: "text-blue-700",    ringColor: "#3b82f6" },
  LEAN:   { icon: TrendingUp, border: "border-l-amber-400",   labelBg: "bg-amber-500",   name: "LEAN",   textColor: "text-amber-700",   ringColor: "#f59e0b" },
};

function fmt(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function ArcGauge({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${arc} ${circumference - arc}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

function ModelDots({ agreement, total = 5 }: { agreement: number; total?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < agreement ? "bg-emerald-500" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

function PickCard({ pick, inSlip, onAdd }: { pick: typeof picks[0]; inSlip: boolean; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = tierDef[pick.tier as keyof typeof tierDef];
  const TierIcon = t.icon;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 border-l-4 ${t.border} shadow-sm group hover:shadow-md transition-shadow`}>
      <div className="px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <ArcGauge value={pick.confidence} color={t.ringColor} size={60} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-gray-800">{pick.confidence}%</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white ${t.labelBg}`}>
                <TierIcon className="w-3 h-3" />
                {t.name}
              </span>
              <span className="text-xs text-gray-400">{pick.sport} · {pick.betType}</span>
            </div>
            <p className="text-base font-bold text-gray-900 leading-snug">{pick.pick}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pick.game} · {pick.time}</p>
          </div>

          <div className="shrink-0 text-right pt-1">
            <p className="text-2xl font-black text-gray-900">{fmt(pick.odds)}</p>
            <p className="text-xs font-bold text-gray-400">{pick.fusionGrade}</p>
          </div>
        </div>

        {(pick.steamMove || pick.reverseLineMove) && (
          <div className="flex gap-2 flex-wrap">
            {pick.steamMove && (
              <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <Flame className="w-3 h-3" /> Steam Move
              </span>
            )}
            {pick.reverseLineMove && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" /> Reverse Line Move
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Edge</p>
              <p className={`text-sm font-black ${pick.edge >= 4 ? "text-emerald-600" : pick.edge >= 2 ? "text-blue-600" : "text-gray-700"}`}>+{pick.edge}%</p>
            </div>
            <MiniBar value={Math.min(pick.edge * 10, 100)} color={pick.edge >= 4 ? "#10b981" : pick.edge >= 2 ? "#3b82f6" : "#9ca3af"} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">True Prob</p>
              <p className="text-sm font-black text-gray-800">{pick.trueProb}%</p>
            </div>
            <MiniBar value={pick.trueProb} color="#8b5cf6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Units</p>
              <p className="text-sm font-black text-gray-800">{pick.units}u</p>
            </div>
            <MiniBar value={(pick.units / 3) * 100} color="#f59e0b" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              <span>Sharp {pick.sharpMoney}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <BarChart3 className="w-3 h-3" />
              <ModelDots agreement={pick.modelAgreement} />
              <span>{pick.modelAgreement}/5</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Analysis"}
          </button>
        </div>

        {expanded && (
          <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-500">
            <p>Sharp consensus and multi-model agreement make this a high-conviction play. Line movement supports the signal direction.</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onAdd}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
            inSlip
              ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-200"
              : "bg-gray-900 hover:bg-gray-800 text-white active:scale-[0.99]"
          }`}
        >
          {inSlip ? <><ShoppingCart className="w-4 h-4" /> In Slip</> : <><Plus className="w-4 h-4" /> Add to Slip</>}
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "generator", label: "Generator", icon: Sparkles },
  { id: "straight",  label: "Straight Bets", icon: TrendingUp },
  { id: "sgp",       label: "SGP",  icon: Shuffle },
  { id: "builder",   label: "Builder", icon: Wrench },
];

export function ElevatedRhythm() {
  const [slip, setSlip] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("straight");
  const [sportFilter, setSportFilter] = useState("All");
  const sports = ["All", "NBA", "NFL", "NHL", "MLB"];

  const visible = sportFilter === "All" ? picks : picks.filter(p => p.sport === sportFilter);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-white border-b border-gray-100">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bet Builder</h1>
            <p className="text-xs text-gray-400 mt-0.5">AI-powered picks · Updated live</p>
          </div>
          {slip.length > 0 && (
            <button className="flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl">
              <ShoppingCart className="w-3.5 h-3.5" />
              {slip.length} in slip
            </button>
          )}
        </div>

        <div className="flex overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {sports.map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sportFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
          <select className="ml-auto text-xs border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-gray-500">
            <option>All Types</option>
            <option>Spread</option>
            <option>Moneyline</option>
            <option>Total</option>
          </select>
        </div>

        <div className="space-y-4">
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
          For analysis purposes only · Must be 21+ · Gamble responsibly
        </p>
      </div>
    </div>
  );
}
