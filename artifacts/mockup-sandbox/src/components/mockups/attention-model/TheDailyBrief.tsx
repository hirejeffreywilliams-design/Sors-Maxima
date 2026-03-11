import "../dashboard-usability/_group.css";
import { useState } from "react";
import { Lock, Star, Rocket, Plus, CheckCircle, Coffee, TrendingUp, Zap } from "lucide-react";

const edition = {
  date: "Tuesday, March 11",
  analyst: "46-Factor Model",
  headline: "Sharp money splits in three directions tonight — Chiefs line has a tell.",
};

const featured = [
  {
    id: 1,
    role: "Lock of the Day",
    roleIcon: Lock,
    roleColor: "text-emerald-400",
    roleBg: "bg-emerald-950/60 border-emerald-800",
    sport: "NBA",
    pick: "Boston Celtics -4.5",
    game: "Boston @ Miami",
    time: "Tonight · 7:30 PM ET",
    odds: -110,
    confidence: 79,
    edge: 5.2,
    units: 2.5,
    headline: "Celtics steamrolled this line and they're not done.",
    body: `Five of five models align here — that's rare. Sharp money came in hard on Boston from -3 to -4.5 between 10am and 2pm, a textbook steam pattern. Miami is missing two rotation players (not yet on the official report, but our injury signal model is flagging it).\n\nThe Celtics are 8-2 ATS as road favorites this season, and Tatum is 11-3 ATS in back-to-backs when the rest advantage is his. This is as confident as the model gets.`,
    verdict: "Play it. 2.5 units, take the spread.",
  },
  {
    id: 2,
    role: "Best Value",
    roleIcon: Star,
    roleColor: "text-blue-400",
    roleBg: "bg-blue-950/60 border-blue-800",
    sport: "NFL",
    pick: "Kansas City Chiefs ML",
    game: "Kansas City @ Las Vegas",
    time: "Tonight · 8:15 PM ET",
    odds: -145,
    confidence: 71,
    edge: 3.8,
    units: 2.0,
    headline: "58% of the public is on the Raiders. The line moved to Kansas City.",
    body: `That's the tell. When public money and line movement point opposite directions, it's a reverse line movement — sharp money on the other side quietly moving the number.\n\nKC is 6-1 ATS in division road games under Mahomes. The Raiders are 1-6 at home as a public favorite this year. This isn't about the Chiefs being great — it's about the Raiders being priced wrong.\n\nThe -145 compresses the value slightly, but the model still finds 3.8% edge at this price.`,
    verdict: "Solid play. 2 units on the moneyline.",
  },
  {
    id: 3,
    role: "Long Shot",
    roleIcon: Rocket,
    roleColor: "text-violet-400",
    roleBg: "bg-violet-950/60 border-violet-800",
    sport: "NHL",
    pick: "Rangers / Penguins Over 6",
    game: "New York Rangers @ Pittsburgh",
    time: "Tonight · 7:00 PM ET",
    odds: -108,
    confidence: 67,
    edge: 2.9,
    units: 1.5,
    headline: "Two leaky defenses, two hot offenses, one number the market hasn't fully caught.",
    body: `This opened at 5.5, moved to 6, and is sitting at 6 with sharp action still coming in on the over. Both goalies are posting sub-.900 save percentages this week — historically a strong signal for high-scoring games.\n\nConfidence is lower here (67%) — three models agree, two are neutral. This is the play with the most uncertainty but also decent plus-money pricing relative to true probability.`,
    verdict: "Smaller stake. 1.5 units. Manage downside.",
  },
];

function formatOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function PickArticle({ pick, inSlip, onAdd }: { pick: typeof featured[0]; inSlip: boolean; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const RoleIcon = pick.roleIcon;
  return (
    <article className={`border rounded-2xl overflow-hidden ${pick.roleBg}`}>
      <div className="px-5 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <RoleIcon className={`w-4 h-4 ${pick.roleColor}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${pick.roleColor}`}>{pick.role}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="bg-gray-800 px-2 py-0.5 rounded-full">{pick.sport}</span>
            <span className="bg-gray-800 px-2 py-0.5 rounded-full font-mono">{formatOdds(pick.odds)}</span>
          </div>
        </div>
        <h2 className="text-lg font-black text-white leading-snug">{pick.pick}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{pick.game} · {pick.time}</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-sm font-semibold text-gray-200 italic">"{pick.headline}"</p>

        <div className={`overflow-hidden transition-all ${expanded ? "max-h-96" : "max-h-16"} relative`}>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{pick.body}</p>
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900/80 to-transparent" />
          )}
        </div>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2">
          {expanded ? "Collapse" : "Read full analysis →"}
        </button>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 bg-gray-900/50 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-500">Confidence</p>
            <p className="text-base font-black text-white">{pick.confidence}%</p>
          </div>
          <div className="flex-1 bg-gray-900/50 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-500">Edge</p>
            <p className="text-base font-black text-emerald-400">+{pick.edge}%</p>
          </div>
          <div className="flex-1 bg-gray-900/50 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-500">Stake</p>
            <p className="text-base font-black text-white">{pick.units}u</p>
          </div>
        </div>

        <div className="bg-gray-800/40 rounded-xl px-3 py-2.5">
          <p className="text-xs font-bold text-gray-400">MODEL VERDICT</p>
          <p className="text-sm text-white font-medium mt-0.5">{pick.verdict}</p>
        </div>

        <button
          onClick={onAdd}
          disabled={inSlip}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
            inSlip
              ? "bg-emerald-900/40 text-emerald-500 cursor-default border border-emerald-800"
              : "bg-emerald-500 hover:bg-emerald-400 text-white active:scale-[0.98]"
          }`}
        >
          {inSlip ? <><CheckCircle className="w-4 h-4" /> In your slip</> : <><Plus className="w-4 h-4" /> Add to Slip</>}
        </button>
      </div>
    </article>
  );
}

export function TheDailyBrief() {
  const [slip, setSlip] = useState<number[]>([]);
  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="px-5 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Coffee className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">The Daily Brief</span>
          <span className="text-xs text-gray-700">·</span>
          <span className="text-xs text-gray-600">{edition.date}</span>
        </div>
        <h1 className="text-xl font-black text-white leading-snug">{edition.headline}</h1>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          Curated by {edition.analyst} · 3 picks selected from {allPicksCount} screened tonight
        </p>
      </div>

      <div className="px-5 py-5 space-y-4">
        {featured.map((pick) => (
          <PickArticle
            key={pick.id}
            pick={pick}
            inSlip={slip.includes(pick.id)}
            onAdd={() => setSlip((s) => s.includes(pick.id) ? s : [...s, pick.id])}
          />
        ))}
      </div>

      <div className="px-5 pb-8 pt-2 border-t border-gray-900">
        <p className="text-xs text-center text-gray-600 mt-4">
          The model screened {allPicksCount} picks tonight and surfaced these 3. Tomorrow's brief publishes at 10 AM.
        </p>
      </div>

      {slip.length > 0 && (
        <div className="fixed bottom-5 left-5 right-5">
          <button className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-4 rounded-2xl font-bold shadow-2xl shadow-black/50 transition-colors">
            <span>Build parlay from slip</span>
            <span className="bg-white text-emerald-700 text-xs px-3 py-1 rounded-full font-bold">{slip.length} pick{slip.length > 1 ? "s" : ""} →</span>
          </button>
        </div>
      )}
    </div>
  );
}

const allPicksCount = 47;
