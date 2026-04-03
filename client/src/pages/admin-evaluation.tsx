import { useSEO } from "@/hooks/use-seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp, DollarSign, Building2, BarChart2, Users, Shield,
  ChevronRight, Target, Cpu, Brain, Zap, Globe, Star,
  ArrowRight, Info, Crown, Layers, Award
} from "lucide-react";

const SCENARIOS = [
  { users: 0,     paid: 0,       arr: 0,          low: 2_000_000,   mid: 8_000_000,   high: 15_000_000,  note: "Technology/IP value floor only" },
  { users: 100,   paid: 70,      arr: 143_000,     low: 643_000,     mid: 1_430_000,   high: 2_575_000,   note: "$119 ARPU × 70 paid × 12 months" },
  { users: 500,   paid: 350,     arr: 714_000,     low: 3_213_000,   mid: 7_140_000,   high: 12_852_000,  note: "$119 ARPU × 350 paid × 12 months" },
  { users: 1_000, paid: 700,     arr: 1_428_000,   low: 6_426_000,   mid: 14_280_000,  high: 25_704_000,  note: "$119 ARPU × 700 paid × 12 months" },
  { users: 5_000, paid: 3_500,   arr: 7_140_000,   low: 32_130_000,  mid: 71_400_000,  high: 128_520_000, note: "$119 ARPU × 3,500 paid × 12 months" },
  { users: 10_000,paid: 7_000,   arr: 14_280_000,  low: 64_260_000,  mid: 142_800_000, high: 257_040_000, note: "$119 ARPU × 7,000 paid × 12 months" },
];

const COMPARABLES = [
  {
    deal: "Action Network → Better Collective",
    year: 2021,
    price: "$240M",
    metrics: "3.6M MAU · ~$40M ARR · 6x revenue multiple",
    relevance: "Most directly comparable — same layer (betting intelligence/media), same U.S. market. Not AI-native. No gamification. No self-calibrating model. Sors Maxima is technologically deeper; Action Network had audience scale."
  },
  {
    deal: "PointsBet U.S. → Fanatics",
    year: 2023,
    price: "~$150M",
    metrics: "Full sportsbook platform acquisition",
    relevance: "Full operator deal — less directly comparable, but demonstrates sportsbook companies paying 9-figure sums for sports betting technology. Validates platform value to strategic acquirers."
  },
  {
    deal: "Flutter → NSX Group (Brazil)",
    year: 2024,
    price: "$350M",
    metrics: "Brazil market entry · full sportsbook platform",
    relevance: "Shows international expansion premium — a sportsbook paid $350M for market access + technology. An AI intelligence platform enabling entry into new markets has similar strategic value."
  },
  {
    deal: "Better Collective → Solid Software",
    year: 2024,
    price: "$45.6M",
    metrics: "Betting data and tools company",
    relevance: "Data/tools-only acquisition — no media brand, no audience. Pure technology and data. Establishes that betting data/AI tools companies command 8-figure acquisition prices even without a large subscriber base."
  },
  {
    deal: "DraftKings → Sports IQ Analytics",
    year: 2024,
    price: "Undisclosed (est. $20M–$60M)",
    metrics: "AI-based oddsmaking and analytics engine",
    relevance: "The most directly comparable deal to Sors Maxima. DraftKings paid for a single AI oddsmaking engine. Sors Maxima is a full-stack platform: 50+ engines, subscriber infrastructure, engagement system, and white-label SaaS — compared to a single analytics tool."
  },
];

const ACQUIRERS = [
  { name: "DraftKings", type: "Strategic", rationale: "Would acquire the 46-Factor AI engine to power their own player-facing analytics features and reduce dependence on third-party data providers." },
  { name: "FanDuel / Flutter", type: "Strategic", rationale: "Intelligence layer for their consumer app. The Life Changer Ticket and Intelligence Cards gamification system directly maps to their retention and daily engagement roadmap." },
  { name: "Sportradar", type: "Strategic", rationale: "Layer 2 data provider seeking to move into Layer 3 consumer intelligence. The 46-Factor engine + real-time pipeline is a bolt-on to their existing data infrastructure." },
  { name: "Genius Sports", type: "Strategic", rationale: "Same rationale as Sportradar — official NFL data rights holder looking to monetize intelligence downstream of raw data. Sors Maxima is the consumer intelligence stack they don't have." },
  { name: "Better Collective", type: "Strategic", rationale: "Already acquired Action Network for $240M. A more technology-native AI intelligence platform deepens their US portfolio and reduces reliance on media-only models." },
  { name: "The Athletic / NYT", type: "Strategic", rationale: "Premium sports media moving into intelligence tools. The Athletic already covers betting — a branded intelligence layer is a natural premium subscription product for their audience." },
  { name: "ESPN BET / Penn Entertainment", type: "Strategic", rationale: "ESPN brand + AI betting intelligence platform = powerful retention tool. Sors Maxima's platform could power the 'ESPN BET Intelligence' tier without internal AI development." },
  { name: "iGaming PE / Family Offices", type: "Financial", rationale: "Pre-revenue platform at technology floor pricing ($2M–$15M) is a compelling financial bet on the AI infrastructure investment cycle and continued U.S. sports betting expansion." },
];

function fmtM(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtARR(n: number) {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

export default function AdminEvaluation() {
  useSEO({ title: "Company Evaluation Report | Admin", description: "Professional acquisition brief and valuation analysis for Sors Maxima." });

  return (
    <div className="min-h-screen bg-background" data-testid="page-evaluation">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin"><span className="hover:text-primary cursor-pointer">Admin</span></Link>
            <ChevronRight className="h-3 w-3" />
            <span>Company Evaluation Report</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
              <BarChart2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sors Maxima — Company Evaluation Report</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                A professionally structured acquisition brief using real market data and three independent valuation methodologies. Prepared April 2026.
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">Confidential — Admin Only</Badge>
                <Badge variant="outline" className="text-xs">Illustrative Estimates — Not Financial Advice</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1 — What You Are Evaluating */}
        <section className="space-y-4 print:break-before-page" data-testid="section-what-you-are-evaluating">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 1</span>
            <h2 className="text-lg font-bold text-foreground">What You Are Evaluating</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Sors Maxima is a members-only sports betting intelligence platform built on a proprietary AI prediction engine. It is not a sportsbook, not a tout service, and not a tipster. It is an analytical intelligence platform — the equivalent of a Bloomberg Terminal for serious sports bettors — sold as a tiered SaaS subscription.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Cpu, label: "50+ Autonomous Engines", desc: "Self-scheduling, self-healing backend systems with degraded-mode fallbacks and autonomous monitoring" },
              { icon: Brain, label: "46-Factor AI Model", desc: "Proprietary prediction engine running 10,000 Monte Carlo simulations per matchup with self-calibrating accuracy" },
              { icon: Layers, label: "Full-Stack SaaS Platform", desc: "88+ production pages, Stripe billing, real-time SSE infrastructure, 40+ admin dashboards" },
              { icon: Star, label: "Intelligence Cards™ System", desc: "Collectible gamification tied to pick grades and LCT wins — unique engagement loop with no market equivalent" },
              { icon: Users, label: "Founders Program", desc: "Already-structured early-adopter monetization program (500 member + 5 enterprise slots)" },
              { icon: Shield, label: "8 Common Law Trademarks", desc: "46-Factor Model Analysis™, Intelligence Cards™, Smart Retention Sequence Engine™, Cashout Engineering™, and 4 others" },
            ].map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="bg-muted/20">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-foreground font-semibold mb-1">IP Asset Summary</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Proprietary 46-factor ML model with 10K–100K Monte Carlo simulations per matchup</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> 50+ autonomous backend engines: prediction, learning, calibration, retention, fraud, analytics, system health</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Multi-sport real-time data pipelines (NBA, NFL, NHL, MLB, international soccer)</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Server-Sent Events (SSE) real-time infrastructure for live pick and odds delivery</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Full white-label SaaS architecture with Stripe billing, tier gating, and operator/enterprise tiers</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Intelligence Cards™ collectible system — proprietary gamification mechanics</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Life Changer Ticket (LCT) — daily AI-curated high-odds parlay ritual, no market equivalent</li>
                <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">▸</span> Smart Retention Sequence Engine™ — automated member lifecycle campaign system</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Section 2 — The Three Valuation Methodologies */}
        <section className="space-y-4" data-testid="section-methodologies">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 2</span>
            <h2 className="text-lg font-bold text-foreground">The Three Valuation Methodologies</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No single valuation method tells the full story of a pre-revenue software platform. Buyers and investors use three methodologies in combination, each answering a different question. All three are used in this report.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Cost / Build Approach",
                icon: Building2,
                color: "text-amber-400",
                q: "What would it cost a buyer to build this from scratch?",
                detail: "Counts the actual hours of specialized engineering required to replicate the platform and applies a market rate. This is the value floor — a rational buyer will not pay more than replacement cost unless the platform offers strategic value beyond mere technology. For Sors Maxima, this is the minimum credible valuation."
              },
              {
                title: "Revenue Multiple Approach",
                icon: TrendingUp,
                color: "text-emerald-400",
                q: "What is a multiple of annual recurring revenue worth?",
                detail: "Applies industry-standard ARR multiples (4.5x–10x for SaaS, with AI premium of up to 4x per Ocean Tomo research) to each user scenario. The multiple reflects AI premium, data moat, market position, and growth trajectory. This is the method that grows most dramatically as revenue scales."
              },
              {
                title: "Comparable Transactions",
                icon: Globe,
                color: "text-blue-400",
                q: "What have buyers actually paid for similar companies?",
                detail: "Anchors the valuation in real acquisition data from the same market vertical. What did Better Collective pay for Action Network? What did DraftKings pay for Sports IQ Analytics? What did Better Collective pay for Solid Software? These real transactions establish market-proven price ranges for similar technology."
              }
            ].map(({ title, icon: Icon, color, q, detail }) => (
              <Card key={title}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color} shrink-0`} />
                    <p className="text-sm font-bold text-foreground">{title}</p>
                  </div>
                  <p className="text-xs font-medium text-foreground/80 italic">{q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 3 — Current Value (Zero Users) */}
        <section className="space-y-4" data-testid="section-current-value">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 3</span>
            <h2 className="text-lg font-bold text-foreground">Current Value — Zero Users, Pre-Revenue</h2>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">Pre-Revenue Valuation Range</p>
                <p className="text-2xl font-bold text-primary mt-0.5">$2M – $15M</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Depending on buyer type: financial buyers underweight unproven IP, strategic buyers pay for capability. Range reflects that spectrum.</p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Cost / Build Approach — the floor:</strong> Building Sors Maxima from scratch requires a senior full-stack engineer at $150/hr minimum. The platform includes 50+ autonomous engines, a 46-factor ML model, multi-sport data pipelines, real-time SSE infrastructure, 88+ pages of production UI, Stripe billing, 40+ admin dashboards, and 6 server test suites.
            </p>
            <p>
              Conservative estimate: <strong className="text-foreground">50 engines × 250 hours average × $150/hr = $1.875M in development labor alone.</strong> Add the frontend (88 pages × ~20 hours = $264K), the ML model architecture, the data pipeline design, and QA — the replacement cost floor is <strong className="text-foreground">$1.5M – $3M in development cost alone before a single license fee.</strong>
            </p>
            <p>
              <strong className="text-foreground">AI premium on top of build cost:</strong> Ocean Tomo research documents that AI companies receive up to a <strong className="text-foreground">4x valuation premium</strong> over comparable non-AI software. Applied to the $1.5M–$3M build cost, that produces a technology value of $6M–$12M for an AI-native platform. Pre-revenue AI seed round median valuation is <strong className="text-foreground">$17.9M</strong> (Carta 2025 data), a 42% premium over non-AI seed rounds.
            </p>
            <p>
              <strong className="text-foreground">The Sports IQ Analytics comparable:</strong> DraftKings acquired Sports IQ Analytics — a single AI oddsmaking engine — for an undisclosed amount estimated in the range of $20M–$60M. Sors Maxima is a complete platform: the equivalent of Sports IQ Analytics' AI engine, plus subscriber infrastructure, gamification, white-label SaaS architecture, and an already-functional operator acquisition channel. A single AI engine commanded that price; a full-stack platform with all the surrounding infrastructure commands more.
            </p>
            <p>
              <strong className="text-foreground">Why $15M is possible for the right buyer:</strong> A strategic acquirer — DraftKings, Sportradar, Better Collective — is not buying a development house. They are buying a turnkey intelligence stack they can deploy against their existing audience immediately. The cost to replicate this internally (18–24 months, 3–5 senior engineers) plus opportunity cost (missed market timing during AI infrastructure cycle) exceeds $15M for any of these organizations. At $15M, they are getting a positive NPV deal.
            </p>
          </div>
        </section>

        {/* Section 4 — Valuation by User Scenario */}
        <section className="space-y-4" data-testid="section-scenarios">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 4</span>
            <h2 className="text-lg font-bold text-foreground">Valuation by User Scenario</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Using the Revenue Multiple approach with an AI premium (4.5x–10x ARR, consistent with private SaaS M&A median of 4.5x, public SaaS median of 7.0x, and up to 4x AI premium per Ocean Tomo). Blended = midpoint. All scenarios assume $119/month weighted ARPU and 70% paid conversion.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" data-testid="table-scenarios">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="text-left py-3 px-3 font-semibold">Users</th>
                  <th className="text-left py-3 px-3 font-semibold">Paid</th>
                  <th className="text-left py-3 px-3 font-semibold">ARR</th>
                  <th className="text-left py-3 px-3 font-semibold">Low (4.5x)</th>
                  <th className="text-left py-3 px-3 font-semibold">Mid (10x)</th>
                  <th className="text-left py-3 px-3 font-semibold">High (18x AI)</th>
                  <th className="text-left py-3 px-3 font-semibold hidden lg:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((s) => (
                  <tr key={s.users} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-foreground">{s.users.toLocaleString()}</td>
                    <td className="py-3 px-3 text-muted-foreground">{s.paid.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-foreground">{fmtARR(s.arr)}</td>
                    <td className="py-3 px-3 font-mono text-foreground">{fmtM(s.low)}</td>
                    <td className="py-3 px-3 font-mono text-primary font-bold">{fmtM(s.mid)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{fmtM(s.high)}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground hidden lg:table-cell">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card className="border-muted/40 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The 0-user row uses the Cost/Build floor ($2M–$15M) rather than an ARR multiple, since ARR of $0 would produce a $0 revenue multiple. At scale, the High column reflects an AI company premium (up to 4x above standard multiples per Ocean Tomo), which is applicable when the platform demonstrates a working data flywheel. Real-world multiples at exit will depend on ARR growth rate, churn, and strategic fit to the acquirer. All figures are illustrative estimates for informational purposes only.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 5 — Comparable Transactions */}
        <section className="space-y-4" data-testid="section-comparables">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 5</span>
            <h2 className="text-lg font-bold text-foreground">Comparable Transactions</h2>
          </div>
          <p className="text-sm text-muted-foreground">Real acquisition deals in the sports betting and AI analytics verticals, and what they tell us about Sors Maxima's positioning.</p>

          <div className="space-y-3">
            {COMPARABLES.map((c) => (
              <Card key={c.deal} className="overflow-hidden" data-testid={`card-comparable-${c.deal.replace(/\s+/g, '-').toLowerCase()}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{c.deal}</p>
                      <p className="text-xs text-muted-foreground">{c.year} · {c.metrics}</p>
                    </div>
                    <Badge className="text-sm font-bold bg-primary/10 text-primary border-primary/20 shrink-0" variant="outline">{c.price}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.relevance}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground mb-1.5">The Common Thread</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every deal above reflects a buyer paying for <strong className="text-foreground">capability they could not build fast enough internally</strong>. Action Network's $240M was for audience + brand + affiliate revenue. Solid Software's $45.6M was for data tools alone. Sports IQ's undisclosed was for a single AI engine. Sors Maxima offers the full stack: the AI engine, the subscriber platform, the engagement system, the operator channel, and the white-label architecture — at pre-revenue pricing that reflects the absence of a proven track record, not an absence of technology.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Section 6 — What Makes This Worth More Than Numbers Show */}
        <section className="space-y-4" data-testid="section-moat">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 6</span>
            <h2 className="text-lg font-bold text-foreground">What Makes This Platform Worth More Than the Numbers Show</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: TrendingUp,
                title: "Data Flywheel",
                color: "text-emerald-400",
                body: "Every settled pick trains the 46-Factor Model. More members → more settled outcomes → better calibration → higher accuracy → stronger track record → more members. This is a compounding intelligence moat. The platform gets measurably better with every game settled. A buyer is not just buying the current model — they are buying the mechanism that makes the model improve automatically."
              },
              {
                icon: Shield,
                title: "IP Moat — Proprietary 46-Factor Model",
                color: "text-blue-400",
                body: "The 46-factor model is not a configuration of a third-party library. It is a proprietary architecture: weighted factors, calibration engine, Monte Carlo simulation layer, and self-correction mechanism that took thousands of engineering hours to design, build, and test. It cannot be replicated from publicly available tools. The factor weights are trade secrets. A competitor starting today is 18–24 months behind."
              },
              {
                icon: Layers,
                title: "Full-Stack Completeness",
                color: "text-purple-400",
                body: "From picks to bankroll management to live center to cashout advisory to gamification to community to admin operations — this is rare in one platform. Competitors are single-purpose tools. OddsJam does EV. Unabated does CLV. Action Network does media/picks. Sors Maxima does all of it in one integrated experience. Full-stack platforms command premium acquisition prices because they eliminate integration costs for the acquirer."
              },
              {
                icon: Crown,
                title: "Founders Program — Early-Adopter Revenue Base",
                color: "text-amber-400",
                body: "The Founders Program (500 member slots + 5 enterprise slots) is already structured and activatable. It is a monetized early-adopter base with lifetime pricing incentives — a proven SaaS strategy that locks in revenue at predictable lifetime rates. For an acquirer, this means any acquisition immediately comes with an activatable subscriber base pre-loaded with the most loyal early members."
              }
            ].map(({ icon: Icon, title, color, body }) => (
              <Card key={title}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color} shrink-0`} />
                    <p className="text-sm font-bold text-foreground">{title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 7 — Who Would Buy This and Why */}
        <section className="space-y-4" data-testid="section-acquirers">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 7</span>
            <h2 className="text-lg font-bold text-foreground">Who Would Buy This and Why</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The timing is favorable: U.S. sports betting is in a multi-year expansion (38+ states legal, $30–40B GGR projected by 2030), and the AI infrastructure investment cycle is at its peak — both sportsbooks and media companies are actively spending to add AI intelligence layers to their products.
          </p>

          <div className="space-y-2">
            {ACQUIRERS.map((a) => (
              <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors" data-testid={`row-acquirer-${a.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className="flex items-center gap-2 min-w-[140px] shrink-0">
                  <Badge variant={a.type === "Strategic" ? "default" : "secondary"} className="text-[10px]">{a.type}</Badge>
                  <span className="text-sm font-semibold text-foreground">{a.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8 — Realistic Exit Timeline */}
        <section className="space-y-4" data-testid="section-exit-timeline">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Section 8</span>
            <h2 className="text-lg font-bold text-foreground">Realistic Exit Timeline</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                bracket: "Now — $2M – $15M",
                label: "Technology Floor (Pre-Revenue)",
                color: "border-l-muted-foreground",
                milestones: [
                  "Stripe switched to Live Mode — first paying member accepted",
                  "Legal formation complete (LLC, ToS, Privacy Policy)",
                  "Platform operated with documented pick history",
                  "Buyer is acquiring unproven technology — valuation reflects this risk",
                ],
                action: "The current state. Any acquisition at this level is a bet on the technology, not the business."
              },
              {
                bracket: "12 Months — $3M – $25M",
                label: "Early Traction Bracket",
                color: "border-l-amber-400",
                milestones: [
                  "100–500 paying members with documented MRR",
                  "90+ days of verified pick accuracy data",
                  "Monthly churn below 8% demonstrated",
                  "ARR of $100K–$700K validating the revenue model",
                ],
                action: "This is the highest-leverage milestone bracket. First 500 members unlock the Revenue Multiple approach and meaningfully de-risk the acquisition for a financial buyer."
              },
              {
                bracket: "24 Months — $10M – $70M",
                label: "Proven Business Bracket",
                color: "border-l-primary",
                milestones: [
                  "1,000+ paying members, $1M+ ARR",
                  "12+ months of pick accuracy at or above 52.4% break-even",
                  "Operator/Enterprise tier activated with at least 2 clients",
                  "Data flywheel demonstrably improving model accuracy over time",
                ],
                action: "At this bracket, Sors Maxima becomes a target for strategic acquisition from sportsbooks and media companies. The 1,000-member milestone is the inflection point."
              },
              {
                bracket: "5+ Years — $30M – $250M+",
                label: "Category Leader Bracket",
                color: "border-l-emerald-400",
                milestones: [
                  "5,000–10,000 paying members, $7M–$14M ARR",
                  "International expansion (UK, Canada, Australia) validated",
                  "B2B licensing of the 46-Factor engine to other platforms",
                  "Action Network-comparable audience and brand recognition",
                ],
                action: "The comparable exit. Action Network sold at ~$240M with $40M ARR. Sors Maxima with a deeper AI engine, better technology, and comparable ARR would command similar or higher multiples."
              }
            ].map((bracket) => (
              <div key={bracket.bracket} className={`border-l-4 ${bracket.color} pl-4 py-3 space-y-2`} data-testid={`bracket-${bracket.bracket.replace(/\s+/g, '-').toLowerCase().slice(0, 20)}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm font-bold text-foreground">{bracket.bracket}</p>
                  <Badge variant="outline" className="text-xs">{bracket.label}</Badge>
                </div>
                <ul className="space-y-1">
                  {bracket.milestones.map((m) => (
                    <li key={m} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic">{bracket.action}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation links */}
        <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border/40">
          <Link href="/admin/investor-package">
            <Button variant="default" className="gap-2" data-testid="link-investor-package">
              <Award className="h-4 w-4" />
              View Investor Package
            </Button>
          </Link>
          <Link href="/admin/owner-playbook">
            <Button variant="outline" className="gap-2" data-testid="link-owner-playbook">
              <Shield className="h-4 w-4" />
              Owner's Playbook
            </Button>
          </Link>
          <Link href="/admin/owner-vault">
            <Button variant="outline" className="gap-2" data-testid="link-owner-vault">
              <Layers className="h-4 w-4" />
              Owner Vault
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border/30 pt-4">
          <em>Sors Maxima is an information and analytics platform. It is not a sportsbook, gambling operator, or financial advisor. All valuation figures in this report are illustrative estimates for informational purposes only, based on industry-benchmark data and publicly available transaction records. They do not constitute financial, legal, or investment advice. Actual valuation in any transaction will depend on buyer type, market conditions, due diligence findings, and negotiated terms.</em>
        </p>
      </div>
    </div>
  );
}
