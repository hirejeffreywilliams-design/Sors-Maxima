import { useSEO } from "@/hooks/use-seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp, DollarSign, Users, Shield, Globe,
  ChevronRight, Cpu, Brain, Award, Star, Zap, Target,
  ArrowRight, Crown, BarChart2, CheckCircle, Building2, Layers
} from "lucide-react";

export default function AdminInvestorPackage() {
  useSEO({ title: "Investor & Acquisition Package | Admin", description: "Leave-behind document for investor and buyer meetings. Print-ready one-pager." });

  return (
    <div className="min-h-screen bg-background" data-testid="page-investor-package">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin"><span className="hover:text-primary cursor-pointer">Admin</span></Link>
            <ChevronRight className="h-3 w-3" />
            <span>Investor & Acquisition Package</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
              <Crown className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sors Maxima — Investor & Acquisition Package</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                A concise leave-behind document for investor and buyer meetings. Print-ready. April 2026.
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">Confidential — For Qualified Investors Only</Badge>
                <Badge variant="outline" className="text-xs">Illustrative Estimates — Not Financial Advice</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="space-y-3" data-testid="section-exec-summary">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Executive Summary</span>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <p className="text-sm text-foreground leading-relaxed">
                <strong>Sors Maxima is a members-only sports betting intelligence platform powered by a proprietary 46-factor AI prediction engine</strong> — purpose-built for serious bettors who want institutional-grade data analysis, not tips. The platform is technology-complete: 50+ autonomous engines, 88+ production pages, full Stripe billing, real-time SSE infrastructure, and a self-calibrating ML model that improves with every settled outcome. It operates in the same market layer where Action Network sold for $240M in 2021. Sors Maxima is a deeper technology platform, at pre-revenue pricing, during the peak of the AI infrastructure investment cycle.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Platform At a Glance */}
        <section className="space-y-3" data-testid="section-platform-glance">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Platform At a Glance</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Autonomous Engines", value: "50+", icon: Cpu, color: "text-primary" },
              { label: "Production Pages", value: "88+", icon: Layers, color: "text-blue-400" },
              { label: "ML Model Factors", value: "46", icon: Brain, color: "text-purple-400" },
              { label: "Monte Carlo Sims / Game", value: "10K–100K", icon: Zap, color: "text-amber-400" },
              { label: "Admin Dashboards", value: "40+", icon: BarChart2, color: "text-emerald-400" },
              { label: "Common Law Trademarks", value: "8", icon: Shield, color: "text-rose-400" },
              { label: "Sports Covered", value: "6+", icon: Globe, color: "text-cyan-400" },
              { label: "Sportsbooks in Live Odds", value: "6+", icon: Target, color: "text-orange-400" },
              { label: "Server Test Suites", value: "6", icon: CheckCircle, color: "text-green-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="bg-muted/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${color} shrink-0`} />
                  <div>
                    <p className="text-sm font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground text-sm">Key Proprietary Systems</p>
              {[
                "46-Factor Model Analysis™ — 46 weighted prediction factors",
                "Quantum Fusion Engine — signal fusion for final confidence score",
                "Smart Retention Sequence Engine™ — automated lifecycle campaigns",
                "Intelligence Cards™ — collectible gamification system",
                "Life Changer Ticket (LCT) — daily AI-curated high-odds parlay",
                "Cashout Engineering™ — Lock & Roll™, Steam Exit™, Sportsbook Sweat™",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground text-sm">Technology Stack</p>
              {[
                "React + TypeScript frontend with SSE real-time updates",
                "Express.js + PostgreSQL backend with Drizzle ORM",
                "OpenAI integration for AI pick explanations",
                "Stripe billing: subscriptions, trials, webhooks",
                "Self-healing architecture — 30+ day autonomous operation",
                "6 server test suites covering critical engine paths",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Revenue Model & ARPU */}
        <section className="space-y-3" data-testid="section-revenue-model">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Revenue Model & ARPU</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="text-left py-2 px-3 font-semibold">Tier</th>
                  <th className="text-left py-2 px-3 font-semibold">Monthly</th>
                  <th className="text-left py-2 px-3 font-semibold">Target Member</th>
                  <th className="text-left py-2 px-3 font-semibold hidden sm:table-cell">Key Feature</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "Sharp", price: "$49", target: "Entry serious bettor", feature: "Daily AI picks, parlay builder" },
                  { tier: "Edge", price: "$99", target: "Daily active bettor", feature: "Life Changer Ticket + live odds (7-day free trial)" },
                  { tier: "Max", price: "$249", target: "Sophisticated bettor", feature: "Full engine depth, custom model weights" },
                  { tier: "Operator", price: "$499", target: "Community operators", feature: "White-label reports, community management" },
                  { tier: "Enterprise", price: "$1,200+", target: "Media companies", feature: "API access, custom SLA, dedicated support" },
                ].map((row) => (
                  <tr key={row.tier} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 font-bold text-foreground">{row.tier}</td>
                    <td className="py-2 px-3 font-mono text-primary">{row.price}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{row.target}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs hidden sm:table-cell">{row.feature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Weighted ARPU:</span>
              <span className="ml-2 font-bold text-primary text-lg">$119/month</span>
            </div>
            <div>
              <span className="text-muted-foreground">Break-even:</span>
              <span className="ml-2 font-bold text-foreground">~10 paying members</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gross margin at scale:</span>
              <span className="ml-2 font-bold text-foreground">84–87%</span>
            </div>
          </div>
        </section>

        {/* Current Valuation Range */}
        <section className="space-y-3" data-testid="section-valuation">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Current Valuation Range (Pre-Revenue)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Financial Buyer Floor", range: "$2M – $5M", note: "Cost/build floor. Technology value alone, no strategic premium.", color: "border-muted" },
              { label: "Typical Strategic Buyer", range: "$5M – $10M", note: "Technology + IP premium + turnkey deployment capability.", color: "border-primary/40" },
              { label: "Right Strategic Acquirer", range: "$10M – $15M", note: "Full platform capability vs. internal build cost + opportunity cost.", color: "border-primary" },
            ].map(({ label, range, note, color }) => (
              <Card key={label} className={`border-2 ${color}`}>
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-xl font-bold text-foreground">{range}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 px-3">Users</th>
                  <th className="text-left py-2 px-3">ARR</th>
                  <th className="text-left py-2 px-3">Low Estimate</th>
                  <th className="text-left py-2 px-3 font-semibold text-primary">Blended Mid</th>
                  <th className="text-left py-2 px-3">High (AI Premium)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { users: "0", arr: "$0", low: "$2M", mid: "$8M", high: "$15M" },
                  { users: "100", arr: "$143K", low: "$643K", mid: "$1.4M", high: "$2.6M" },
                  { users: "500", arr: "$714K", low: "$3.2M", mid: "$7.1M", high: "$12.9M" },
                  { users: "1,000", arr: "$1.43M", low: "$6.4M", mid: "$14.3M", high: "$25.7M" },
                  { users: "5,000", arr: "$7.14M", low: "$32M", mid: "$71M", high: "$129M" },
                  { users: "10,000", arr: "$14.3M", low: "$64M", mid: "$143M", high: "$257M" },
                ].map((row) => (
                  <tr key={row.users} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 font-bold text-foreground">{row.users}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{row.arr}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{row.low}</td>
                    <td className="py-2 px-3 font-mono font-bold text-primary">{row.mid}</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{row.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Revenue multiples: 4.5x–10x ARR (private SaaS median 4.5x, public SaaS median 7.0x) with up to 4x AI premium per Ocean Tomo research. Illustrative estimates only.</p>
        </section>

        {/* Why Now */}
        <section className="space-y-3" data-testid="section-why-now">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Why Now — Market Timing</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Globe, title: "Sports Betting Expansion", body: "$15B+ U.S. GGR in 2025, projected $30–40B by 2030. 38+ states legal. Millions of new bettors entering the market annually." },
              { icon: Brain, title: "AI Infrastructure Cycle", body: "The largest AI infrastructure investment cycle in history is underway. Sportsbooks and media companies are spending billions to add AI intelligence to their products." },
              { icon: TrendingUp, title: "Exit Precedent Established", body: "Action Network → Better Collective at $240M confirmed the category exit is real. The playbook is written. This is the pre-revenue entry opportunity." },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="bg-muted/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">{title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Strategic Fit */}
        <section className="space-y-3" data-testid="section-strategic-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Strategic Fit — Who Should Buy This</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { type: "Sportsbooks (DraftKings, FanDuel, ESPN BET)", rationale: "Deploy the 46-Factor AI engine as a subscriber intelligence feature. Reduces dependence on third-party data providers. Life Changer Ticket + Intelligence Cards drive daily app engagement." },
              { type: "Data Providers (Sportradar, Genius Sports)", rationale: "Layer 3 consumer intelligence stack built on top of Layer 2 data infrastructure. Immediate downstream monetization of raw data assets they already hold." },
              { type: "Sports Media (The Athletic, Better Collective)", rationale: "Premium intelligence subscription added to existing sports media audience. Action Network was $240M — a deeper AI platform bought at pre-revenue pricing is a superior entry point." },
              { type: "PE / Family Offices (iGaming / Fintech)", rationale: "Pre-revenue technology platform at floor pricing, in a market growing 20–25% annually. AI infrastructure investment thesis. Clear milestone-based value creation roadmap." },
            ].map(({ type, rationale }) => (
              <Card key={type}>
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-sm font-bold text-foreground">{type}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rationale}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Comparable Exits */}
        <section className="space-y-3" data-testid="section-comparable-exits">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Comparable Exits</span>
          </div>
          <div className="space-y-2">
            {[
              { deal: "Action Network → Better Collective", year: "2021", price: "$240M", arpu: "~$40M ARR · 6x revenue · media/affiliate model · not AI-native" },
              { deal: "Better Collective → Solid Software", year: "2024", price: "$45.6M", arpu: "Betting data/tools company · no subscriber base" },
              { deal: "DraftKings → Sports IQ Analytics", year: "2024", price: "Undisclosed", arpu: "Single AI oddsmaking engine · Sors Maxima is the full stack" },
              { deal: "PointsBet U.S. → Fanatics", year: "2023", price: "$150M", arpu: "Full sportsbook platform" },
            ].map((c) => (
              <div key={c.deal} className="flex items-center gap-4 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">{c.price}</Badge>
                  <span className="text-xs text-muted-foreground">{c.year}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.deal}</p>
                  <p className="text-xs text-muted-foreground">{c.arpu}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Next Steps */}
        <section className="space-y-3" data-testid="section-next-steps">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Contact & Next Steps</span>
          </div>
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">For Strategic Acquirers</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {[
                      "Request a live platform walkthrough (90 minutes)",
                      "Access the full technical data room on request",
                      "Review the Company Evaluation Report (full acquisition brief)",
                      "Discuss integration scenarios and deployment timelines",
                    ].map((step) => (
                      <div key={step} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">For Investors</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {[
                      "Review the full Company Evaluation Report",
                      "Request a codebase walkthrough with the founder",
                      "Discuss seed investment structure and equity terms",
                      "Align on 12-month milestone targets for value creation",
                    ].map((step) => (
                      <div key={step} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Contact:</strong> All inquiries are handled directly by the founder via the Sors Maxima platform contact form or through the referring party. NDA available on request.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Navigation */}
        <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border/40">
          <Link href="/admin/evaluation">
            <Button variant="default" className="gap-2" data-testid="link-full-evaluation">
              <BarChart2 className="h-4 w-4" />
              Full Evaluation Report
            </Button>
          </Link>
          <Link href="/admin/owner-vault">
            <Button variant="outline" className="gap-2" data-testid="link-owner-vault">
              <Shield className="h-4 w-4" />
              Owner Vault
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border/30 pt-4">
          <em>Sors Maxima is an information and analytics platform. It is not a sportsbook, gambling operator, or financial advisor. All valuation figures are illustrative estimates for informational purposes only and do not constitute financial, legal, or investment advice. Sports betting involves financial risk.</em>
        </p>
      </div>
    </div>
  );
}
