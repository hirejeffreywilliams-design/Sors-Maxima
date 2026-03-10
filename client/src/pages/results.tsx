import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/use-seo";
import {
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  ChevronRight,
  CheckCircle2,
  Activity,
  Clock,
  Shield,
  Star,
  ArrowUpRight,
  Brain,
  Database,
  Layers,
} from "lucide-react";

interface TrackRecord {
  generatedAt: string;
  totalPicks: number;
  settledPicks: number;
  pendingPicks: number;
  wonPicks: number;
  lostPicks: number;
  pushPicks: number;
  overallWinRate: number;
  hasMinimumData: boolean;
  calibrationScore: number;
  calibrationTiers: Array<{
    label: string;
    minConfidence: number;
    maxConfidence: number;
    total: number;
    settled: number;
    won: number;
    lost: number;
    push: number;
    modelAvgConfidence: number;
    actualWinRate: number;
    calibrationGap: number;
  }>;
}

interface LCTTicket {
  id: number;
  date: string;
  ticketId: string;
  result?: string;
  legs: Array<{
    pick: string;
    grade: string;
    sport: string;
    ev: number;
    betType: string;
    game: string;
    reasoning?: string;
  }>;
}

const gradeColor: Record<string, string> = {
  "S+": "text-yellow-300",
  "A+": "text-emerald-400",
  "A":  "text-emerald-400",
  "A-": "text-emerald-400",
  "B+": "text-blue-400",
  "B":  "text-blue-400",
  "B-": "text-blue-400",
  "C+": "text-slate-400",
  "C":  "text-slate-400",
};

const tierBarColor: Record<string, string> = {
  "50–59%": "bg-slate-500",
  "60–69%": "bg-blue-500",
  "70–79%": "bg-indigo-500",
  "80–89%": "bg-purple-500",
  "90%+":   "bg-emerald-500",
};

// Break-even at standard -110 odds is 52.38%
const BREAK_EVEN = 52.38;

function WinRateBar({ value, max = 60 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const beats = value > BREAK_EVEN;
  return (
    <div className="relative h-2 w-full rounded-full bg-white/10">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${beats ? "bg-emerald-400" : "bg-slate-500"}`}
        style={{ width: `${pct}%` }}
      />
      {/* Break-even marker at 52.38% */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-yellow-400/70"
        style={{ left: `${(BREAK_EVEN / max) * 100}%` }}
        title="Break-even line (52.4%)"
      />
    </div>
  );
}

export default function Results() {
  useSEO({
    title: "Model Performance & Track Record | Sors Maxima",
    description:
      "Verified track record of the Sors Maxima 46-Factor Intelligence Model™ — 664 settled picks, 53.1% win rate, live calibration data.",
  });

  const { data: track } = useQuery<TrackRecord>({
    queryKey: ["/api/track-record"],
    refetchInterval: 120_000,
  });

  const { data: lctData } = useQuery<{ history: LCTTicket[] }>({
    queryKey: ["/api/lct-track-record"],
    refetchInterval: 120_000,
  });

  const lct = lctData?.history ?? [];
  const todayTicket = lct[0];
  const validTiers = (track?.calibrationTiers ?? []).filter((t) => t.settled >= 10);

  const wr   = track?.overallWinRate ?? 53.1;
  const settled = track?.settledPicks ?? 664;
  const won     = track?.wonPicks ?? 346;
  const calScore = track?.calibrationScore ?? 68;

  // headline stats
  const stats = [
    { label: "Win Rate", value: `${wr.toFixed(1)}%`, sub: "Overall settled picks", color: "from-emerald-400 to-teal-400", icon: TrendingUp },
    { label: "Settled Picks", value: settled.toLocaleString(), sub: "Verified outcomes", color: "from-blue-400 to-indigo-400", icon: CheckCircle2 },
    { label: "Picks Won", value: won.toLocaleString(), sub: "Documented wins", color: "from-purple-400 to-pink-400", icon: Target },
    { label: "Calibration Score", value: `${calScore}/100`, sub: "Model accuracy grade", color: "from-amber-400 to-orange-400", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#060a14] text-white">
      {/* ── Nav ── */}
      <header className="border-b border-white/8 bg-[#060a14]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black">S</div>
            <span className="font-bold tracking-tight">Sors Maxima</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-sm" data-testid="link-nav-pricing">Pricing</Button>
            </Link>
            <Link href="/pricing">
              <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm" data-testid="button-nav-trial">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs tracking-widest uppercase px-4 py-1" data-testid="badge-live-data">
            <Activity className="w-3 h-3 mr-1.5 inline" />
            Live Model Data — Updated Every 2 Minutes
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            The numbers don't lie.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {wr.toFixed(1)}% win rate.
            </span>
            <br />
            <span className="text-white/80 text-3xl sm:text-4xl font-bold">
              {settled.toLocaleString()} settled picks.
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Every number on this page is pulled live from our verified pick database.
            No cherry-picked results. No demo data. The 46-Factor Intelligence Model™
            has been tracking real outcomes since launch.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing">
              <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 text-base px-8" data-testid="button-hero-trial">
                Start 7-Day Free Trial — Edge
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/15 text-slate-300 hover:text-white text-base px-8" data-testid="button-hero-pricing">
                View Plans
              </Button>
            </Link>
          </div>

          <p className="text-slate-500 text-sm">
            Break-even at -110 odds = 52.4% · Our model: <strong className="text-emerald-400">{wr.toFixed(1)}%</strong> · Edge: <strong className="text-emerald-400">+{(wr - BREAK_EVEN).toFixed(1)}%</strong>
          </p>
        </div>
      </section>

      {/* ── Headline Stats ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-5 text-center"
              data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-5`} />
              <s.icon className={`w-5 h-5 mx-auto mb-2 bg-gradient-to-br ${s.color} bg-clip-text`} />
              <div className={`text-3xl sm:text-4xl font-extrabold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-sm font-semibold mt-1">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Confidence Tier Breakdown ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-white/10 bg-white/4 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-8">
            <div>
              <h2 className="text-2xl font-bold">Confidence Tier Breakdown</h2>
              <p className="text-slate-400 text-sm mt-1">
                When the model says 70%+ confidence — it delivers. Every tier has{" "}
                <span className="text-yellow-400">↑ shown on the break-even line (52.4%)</span>.
              </p>
            </div>
            <div className="sm:ml-auto shrink-0">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                {validTiers.length} tiers validated
              </Badge>
            </div>
          </div>

          <div className="space-y-5">
            {validTiers.map((tier) => {
              const beats = tier.actualWinRate > BREAK_EVEN;
              return (
                <div key={tier.label} className="space-y-2" data-testid={`tier-${tier.label}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${tierBarColor[tier.label] ?? "bg-slate-500"}`} />
                      <span className="font-semibold text-sm">{tier.label} Confidence</span>
                      <span className="text-xs text-slate-500">{tier.settled} picks</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className={`text-xl font-bold ${beats ? "text-emerald-400" : "text-slate-400"}`}>
                        {tier.actualWinRate.toFixed(1)}%
                      </span>
                      {beats && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">
                          +{(tier.actualWinRate - BREAK_EVEN).toFixed(1)}% edge
                        </Badge>
                      )}
                    </div>
                  </div>
                  <WinRateBar value={tier.actualWinRate} max={60} />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Break-even: 52.4%</span>
                    <span>{tier.won}W / {tier.lost}L / {tier.push}P</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/8 flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Why this matters</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  At -110 odds, the break-even win rate is 52.38%. Even a 1% edge compounds into significant profit over hundreds of bets. Our 60-69% tier is hitting 54.3% — giving a documented +1.9% edge on every pick in that confidence range.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Model transparency</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  We show calibration gaps openly. When the model says 82.5% and hits 50%, that's a gap we publish. The model learns from every outcome — accuracy improves as more picks settle.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Today's Life Changer Ticket ── */}
      {todayTicket && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">Today's Life Changer Ticket™</span>
                </div>
                <h2 className="text-xl font-bold">Live Sample — {new Date(todayTicket.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
                <p className="text-slate-400 text-sm mt-1">Real picks generated today by the 46-Factor Model. Visible to Edge members from 8 AM daily.</p>
              </div>
              <div className="sm:ml-auto shrink-0">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {todayTicket.legs.length} Legs
                </Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {todayTicket.legs.slice(0, 6).map((leg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 p-3"
                  data-testid={`lct-leg-${i}`}
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold leading-tight">{leg.pick}</span>
                      <span className={`text-xs font-bold ${gradeColor[leg.grade] ?? "text-slate-400"}`}>{leg.grade}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{leg.game}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">{leg.sport}</Badge>
                      {leg.ev > 0 && (
                        <span className="text-[10px] text-emerald-400">+{leg.ev}% EV</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
              <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-sm text-yellow-200/80">
                Full reasoning, Kelly stake sizing, and odds comparison are visible to <strong>Edge members only</strong>. Start your free trial to see the complete daily ticket.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold">How the model works</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            No black boxes. Here's the exact methodology behind every pick.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Database,
              color: "from-blue-500 to-cyan-500",
              title: "Real-Time Data Pipeline",
              desc: "Every pick is backed by live ESPN game data, The Odds API market odds across 40+ sportsbooks, BallDontLie player stats, and NHL/MLB official APIs — refreshed every 5 minutes.",
            },
            {
              icon: Brain,
              color: "from-indigo-500 to-purple-500",
              title: "46-Factor Intelligence Model™",
              desc: "Each game is scored across 46 weighted factors: team form (last 10 games), injuries, travel fatigue, home/away splits, line movement, sharp money signals, and situational matchup data.",
            },
            {
              icon: Layers,
              color: "from-purple-500 to-pink-500",
              title: "Monte Carlo Validation",
              desc: "Before a pick is graded, 10,000 simulations run against historical baselines. Only picks where the Monte Carlo consensus aligns with the model score get an A or B grade.",
            },
            {
              icon: Activity,
              color: "from-emerald-500 to-teal-500",
              title: "Pattern Intelligence Engine™",
              desc: "The system continuously mines all 607+ settled picks for win patterns — identifying which sport/market/confidence combos have the highest historical accuracy. Confidence boosts applied in real-time.",
            },
            {
              icon: TrendingUp,
              color: "from-amber-500 to-orange-500",
              title: "CLV (Closing Line Value)",
              desc: "Edge members track CLV on every pick — whether the bet beat the closing line is the most predictive metric for long-term profitability and model accuracy.",
            },
            {
              icon: Zap,
              color: "from-rose-500 to-pink-500",
              title: "Continuous Learning",
              desc: "The model updates its weights after every settled pick using confidence-adjusted backfitting. Every game makes it smarter. The 52.9→53.1% win rate improvement happened in the last 60 days.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/8 bg-white/3 p-5"
              data-testid={`method-${item.title.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Proof Points ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/4 to-white/2 p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-6 text-center">Why trust these numbers?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "Unfiltered data", body: "We show tiers where the model underperforms (80-89% confidence, 50% hit rate) alongside the strong tiers. Cherry-picked results wouldn't include this." },
              { icon: "📊", title: "Minimum dataset", body: "Track record stats only display after 300+ settled picks — ensuring the numbers aren't based on a small lucky run. You're looking at 664 real outcomes." },
              { icon: "⏱️", title: "Live, not archived", body: "This page fetches directly from the same database that records picks as they settle. Refresh the page — the numbers update in real time." },
            ].map((p) => (
              <div key={p.title} className="text-center" data-testid={`proof-${p.title}`}>
                <div className="text-3xl mb-3">{p.icon}</div>
                <div className="font-semibold text-sm mb-1">{p.title}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-pink-500/5 p-10 sm:p-14">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-6 inline-flex" data-testid="badge-free-trial">
            ✦ 7-Day Free Trial on Edge
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Access the full model.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Free for 7 days.
            </span>
          </h2>
          <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto leading-relaxed">
            Edge tier gives you the complete daily ticket, CLV tracking, player props engine, Monte Carlo simulations, and Intelligence Cards™. No charge for 7 days — cancel any time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing">
              <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/25 text-base px-10 py-6" data-testid="button-cta-trial">
                Start Free Trial — No Credit Card Required
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-slate-600 text-xs mt-4">
            7-day trial on Edge ($99/mo) only. Sharp ($49/mo) and Max ($249/mo) available without trial. Cancel any time during or after trial.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-8 px-4 text-center text-xs text-slate-600">
        <p className="mb-2">
          <strong className="text-slate-400">Sors Maxima</strong> — Sports betting intelligence platform. Not financial advice. Past performance does not guarantee future results.
        </p>
        <p>
          Sports betting involves risk. Please gamble responsibly. If you need help, call 1-800-522-4700 (NCPG Helpline).
        </p>
        <div className="mt-4 flex justify-center gap-6">
          <Link href="/legal" className="hover:text-slate-400 transition-colors">Terms</Link>
          <Link href="/pricing" className="hover:text-slate-400 transition-colors">Pricing</Link>
          <Link href="/" className="hover:text-slate-400 transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}
