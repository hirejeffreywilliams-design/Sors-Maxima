import "./_group.css";
import { Lock, Zap, TrendingUp, Eye, BarChart3, Plus } from "lucide-react";

const picks = [
  {
    id: 1, tier: "LOCK", sport: "NBA", betType: "Spread", pick: "Boston Celtics -4.5",
    game: "BOS @ MIA · Tonight 7:30 PM", odds: -110, confidence: 79, edge: 5.2,
    trueProb: 63, units: 2.5, sharpMoney: 72, modelAgreement: 5, steamMove: true, reverseLineMove: false,
  },
  {
    id: 2, tier: "STRONG", sport: "NFL", betType: "Moneyline", pick: "Kansas City Chiefs ML",
    game: "KC @ LV · Tonight 8:15 PM", odds: -145, confidence: 71, edge: 3.8,
    trueProb: 68, units: 2.0, sharpMoney: 61, modelAgreement: 4, steamMove: false, reverseLineMove: true,
  },
  {
    id: 3, tier: "STRONG", sport: "NHL", betType: "Total", pick: "Rangers/Penguins Over 6",
    game: "NYR @ PIT · Tonight 7:00 PM", odds: -108, confidence: 67, edge: 2.9,
    trueProb: 58, units: 1.5, sharpMoney: 55, modelAgreement: 4, steamMove: false, reverseLineMove: false,
  },
  {
    id: 4, tier: "LEAN", sport: "MLB", betType: "Moneyline", pick: "Houston Astros ML",
    game: "HOU @ TEX · Tonight 8:05 PM", odds: +115, confidence: 58, edge: 1.4,
    trueProb: 53, units: 1.0, sharpMoney: 48, modelAgreement: 3, steamMove: false, reverseLineMove: false,
  },
];

const tierConfig: Record<string, { bg: string; ring: string; label: string; icon: any }> = {
  LOCK:   { bg: "bg-emerald-500", ring: "ring-2 ring-emerald-400/40", label: "LOCK", icon: Lock },
  STRONG: { bg: "bg-blue-500",    ring: "ring-2 ring-blue-400/30",    label: "STRONG", icon: Zap },
  LEAN:   { bg: "bg-amber-500",   ring: "ring-1 ring-amber-400/20",   label: "LEAN", icon: TrendingUp },
};

const tierSection: Record<string, { heading: string; sub: string; border: string }> = {
  LOCK:   { heading: "Top-Rated Locks", sub: "Highest-confidence picks — model consensus ≥ 75%", border: "border-l-4 border-emerald-500" },
  STRONG: { heading: "Strong Picks",    sub: "Solid edge with multi-model agreement",           border: "border-l-4 border-blue-500" },
  LEAN:   { heading: "Lean Picks",      sub: "Positive edge but lower certainty",               border: "border-l-4 border-amber-500" },
};

function formatOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function PickRow({ pick, rank }: { pick: typeof picks[0]; rank: number }) {
  const tier = tierConfig[pick.tier];
  const TierIcon = tier.icon;
  return (
    <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-500">#{rank}</span>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white ${tier.bg}`}>
            <TierIcon className="w-3 h-3" />
            {tier.label}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pick.sport}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{pick.betType}</span>
          {pick.steamMove && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Steam</span>
          )}
          {pick.reverseLineMove && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">RLM</span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{pick.pick}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pick.game}</p>
          </div>
          <span className="text-xl font-bold text-gray-900 shrink-0">{formatOdds(pick.odds)}</span>
        </div>
        <div className="grid grid-cols-4 gap-3 pt-1">
          <div>
            <p className="text-xs text-gray-400">Confidence</p>
            <p className="text-sm font-bold text-gray-900">{pick.confidence}%</p>
            <ConfidenceBar value={pick.confidence} color="bg-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Edge</p>
            <p className={`text-sm font-bold ${pick.edge > 3 ? "text-emerald-600" : "text-blue-600"}`}>+{pick.edge}%</p>
            <ConfidenceBar value={Math.min(pick.edge * 10, 100)} color={pick.edge > 3 ? "bg-emerald-400" : "bg-blue-400"} />
          </div>
          <div>
            <p className="text-xs text-gray-400">True Prob</p>
            <p className="text-sm font-bold text-gray-900">{pick.trueProb}%</p>
            <ConfidenceBar value={pick.trueProb} color="bg-violet-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Units</p>
            <p className="text-sm font-bold text-gray-900">{pick.units}u</p>
            <ConfidenceBar value={pick.units * 25} color="bg-amber-400" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 pt-0.5">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Sharp {pick.sharpMoney}%</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Models {pick.modelAgreement}/5</span>
        </div>
      </div>
      <button className="flex-shrink-0 mt-1 p-1.5 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-400 transition-colors">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

const tiers = ["LOCK", "STRONG", "LEAN"] as const;
let globalRank = 0;

export function InformationHierarchy() {
  return (
    <div className="min-h-screen bg-gray-50 p-5 space-y-6" style={{ fontFamily: "Inter, sans-serif" }}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-gray-900">Today's Picks</h1>
          <div className="flex items-center gap-2">
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option>All Sports</option>
              <option>NBA</option>
              <option>NFL</option>
            </select>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option>All Types</option>
              <option>Spread</option>
              <option>Moneyline</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400">Ranked by confidence tier · {picks.length} picks available</p>
      </div>

      <div className="flex items-center gap-3">
        {(["LOCK", "STRONG", "LEAN"] as const).map((t) => {
          const c = tierConfig[t];
          const count = picks.filter((p) => p.tier === t).length;
          return (
            <div key={t} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} text-white text-xs font-semibold`}>
              <c.icon className="w-3.5 h-3.5" />
              {t} ({count})
            </div>
          );
        })}
      </div>

      {tiers.map((tier) => {
        const group = picks.filter((p) => p.tier === tier);
        if (!group.length) return null;
        const sec = tierSection[tier];
        return (
          <section key={tier} className="space-y-2">
            <div className={`pl-3 py-1 ${sec.border} bg-white rounded-r-lg`}>
              <h2 className="text-sm font-bold text-gray-900">{sec.heading}</h2>
              <p className="text-xs text-gray-400">{sec.sub}</p>
            </div>
            <div className="space-y-2">
              {group.map((pick, i) => {
                globalRank++;
                return <PickRow key={pick.id} pick={pick} rank={globalRank} />;
              })}
            </div>
          </section>
        );
      })}

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Parlay Slip</h2>
            <p className="text-xs text-gray-400">0 legs · Payout: —</p>
          </div>
          <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium">Build Parlay</button>
        </div>
        <div className="text-center py-4 text-xs text-gray-300">Add picks to build your parlay</div>
      </div>
    </div>
  );
}
