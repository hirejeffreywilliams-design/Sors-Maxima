import "../dashboard-usability/_group.css";
import { useState } from "react";
import { ChevronUp, ChevronDown, Lock, Zap, TrendingUp, Plus, CheckCircle, ArrowUpDown, Flame } from "lucide-react";

const allPicks = [
  { id: 1, tier: "LOCK",   sport: "NBA", type: "Spread",    pick: "Celtics -4.5",      game: "BOS@MIA", time: "7:30p", odds: -110, conf: 79, edge: 5.2, sharp: 72, models: 5, units: 2.5, steam: true,  rlm: false },
  { id: 2, tier: "STRONG", sport: "NFL", type: "ML",        pick: "Chiefs ML",          game: "KC@LV",   time: "8:15p", odds: -145, conf: 71, edge: 3.8, sharp: 61, models: 4, units: 2.0, steam: false, rlm: true  },
  { id: 3, tier: "STRONG", sport: "NHL", type: "Total",     pick: "Rangers/Pens O6",    game: "NYR@PIT", time: "7:00p", odds: -108, conf: 67, edge: 2.9, sharp: 55, models: 4, units: 1.5, steam: false, rlm: false },
  { id: 4, tier: "LEAN",   sport: "MLB", type: "ML",        pick: "Astros ML",          game: "HOU@TEX", time: "8:05p", odds:  115, conf: 58, edge: 1.4, sharp: 48, models: 3, units: 1.0, steam: false, rlm: false },
  { id: 5, tier: "STRONG", sport: "NBA", type: "ML",        pick: "76ers ML",           game: "PHI@CHI", time: "8:00p", odds: -120, conf: 69, edge: 3.1, sharp: 58, models: 4, units: 1.5, steam: false, rlm: false },
  { id: 6, tier: "LEAN",   sport: "NFL", type: "Spread",    pick: "Packers -2.5",       game: "GB@DET",  time: "1:00p", odds: -112, conf: 61, edge: 1.9, sharp: 52, models: 3, units: 1.0, steam: false, rlm: false },
  { id: 7, tier: "LOCK",   sport: "NHL", type: "ML",        pick: "Avalanche ML",       game: "COL@MIN", time: "9:00p", odds: -135, conf: 76, edge: 4.6, sharp: 68, models: 5, units: 2.0, steam: true,  rlm: false },
  { id: 8, tier: "STRONG", sport: "MLB", type: "Total",     pick: "Dodgers/Padres U8",  game: "LAD@SD",  time: "9:10p", odds: -105, conf: 66, edge: 2.6, sharp: 57, models: 4, units: 1.5, steam: false, rlm: true  },
];

const tierBadge: Record<string, { icon: any; cls: string }> = {
  LOCK:   { icon: Lock,       cls: "text-emerald-700 bg-emerald-100" },
  STRONG: { icon: Zap,        cls: "text-blue-700 bg-blue-100" },
  LEAN:   { icon: TrendingUp, cls: "text-amber-700 bg-amber-100" },
};

const tierOrder: Record<string, number> = { LOCK: 0, STRONG: 1, LEAN: 2 };

type SortKey = "tier" | "conf" | "edge" | "sharp" | "odds" | "units";
type SortDir = "asc" | "desc";

function fmt(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function ConfDot({ v }: { v: number }) {
  const color = v >= 70 ? "#10b981" : v >= 60 ? "#3b82f6" : "#f59e0b";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="font-mono tabular-nums">{v}%</span>
    </span>
  );
}

function SortButton({ label, col, sort, onSort }: { label: string; col: SortKey; sort: [SortKey, SortDir]; onSort: (k: SortKey) => void }) {
  const active = sort[0] === col;
  return (
    <button onClick={() => onSort(col)} className={`flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide hover:text-white transition-colors ${active ? "text-white" : "text-gray-500"}`}>
      {label}
      {active ? (sort[1] === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

export function TheWarRoom() {
  const [sort, setSort] = useState<[SortKey, SortDir]>(["tier", "asc"]);
  const [slip, setSlip] = useState<number[]>([]);
  const [sportFilter, setSportFilter] = useState<string>("ALL");

  const toggleSort = (k: SortKey) => {
    setSort(([cur, dir]) => k === cur ? [k, dir === "asc" ? "desc" : "asc"] : [k, "desc"]);
  };

  const sortFn = (a: typeof allPicks[0], b: typeof allPicks[0]): number => {
    const [k, d] = sort;
    const mul = d === "asc" ? 1 : -1;
    if (k === "tier") return mul * (tierOrder[a.tier] - tierOrder[b.tier]);
    if (k === "conf") return mul * (a.conf - b.conf);
    if (k === "edge") return mul * (a.edge - b.edge);
    if (k === "sharp") return mul * (a.sharp - b.sharp);
    if (k === "odds") return mul * (a.odds - b.odds);
    if (k === "units") return mul * (a.units - b.units);
    return 0;
  };

  const visible = allPicks
    .filter((p) => sportFilter === "ALL" || p.sport === sportFilter)
    .sort(sortFn);

  const addedCount = slip.length;
  const sports = ["ALL", "NBA", "NFL", "NHL", "MLB"];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col" style={{ fontFamily: "'JetBrains Mono', 'Fira Mono', monospace" }}>
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">WAR ROOM</span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-emerald-400">{visible.length} picks · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>
        <div className="flex items-center gap-2">
          {sports.map((s) => (
            <button key={s} onClick={() => setSportFilter(s)} className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${sportFilter === s ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">{addedCount} in slip</span>
          {addedCount > 0 && (
            <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500 transition-colors">
              Build Parlay →
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-3 py-2.5 text-left w-8">
                <SortButton label="Tier" col="tier" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-left">Pick</th>
              <th className="px-3 py-2.5 text-left text-gray-500 font-normal">Game</th>
              <th className="px-3 py-2.5 text-left text-gray-500 font-normal">Time</th>
              <th className="px-3 py-2.5 text-right">
                <SortButton label="Conf" col="conf" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortButton label="Edge" col="edge" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortButton label="Sharp" col="sharp" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortButton label="Odds" col="odds" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortButton label="Units" col="units" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5 text-center w-12"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => {
              const badge = tierBadge[p.tier];
              const TierIcon = badge.icon;
              const inSlip = slip.includes(p.id);
              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-900 transition-colors ${inSlip ? "bg-emerald-950/40" : i % 2 === 0 ? "bg-gray-900/20 hover:bg-gray-800/40" : "hover:bg-gray-800/40"}`}
                >
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${badge.cls}`}>
                      <TierIcon className="w-3 h-3" />
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{p.pick}</span>
                      <span className="text-gray-600 text-xs">{p.sport} · {p.type}</span>
                      {p.steam && <Flame className="w-3 h-3 text-red-400" />}
                      {p.rlm && <span className="text-xs font-bold text-amber-400">RLM</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono">{p.game}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono">{p.time}</td>
                  <td className="px-3 py-2.5 text-right"><ConfDot v={p.conf} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-mono font-bold ${p.edge >= 4 ? "text-emerald-400" : p.edge >= 2.5 ? "text-blue-400" : "text-gray-400"}`}>+{p.edge}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-mono ${p.sharp >= 60 ? "text-emerald-400" : "text-gray-400"}`}>{p.sharp}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-white">{fmt(p.odds)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-300">{p.units}u</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => setSlip((s) => inSlip ? s.filter((x) => x !== p.id) : [...s, p.id])}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${inSlip ? "bg-emerald-500 text-white" : "border border-gray-700 text-gray-600 hover:border-emerald-500 hover:text-emerald-400"}`}
                    >
                      {inSlip ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-6 text-xs text-gray-600">
        <span>● ≥70% conf</span>
        <span className="text-blue-600">● 60–69%</span>
        <span className="text-amber-600">● &lt;60%</span>
        <span className="ml-auto text-gray-700">Click column header to sort · Click + to add to slip</span>
      </div>
    </div>
  );
}
