import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Brain,
  Activity,
  Wrench,
  Users,
  Shield,
  Target,
  ChevronRight,
  Star,
  Check,
  Atom,
  Lock,
  Database,
  CheckCircle,
  Trophy,
  Flame,
} from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";
import { useSEO } from "@/hooks/use-seo";
import { GoldenTicketHero } from "@/components/golden-ticket-hero";

const features = [
  {
    icon: Activity,
    title: "Rest Advantage",
    description: "Proprietary algorithms calculate the impact of travel, scheduling, and days between games for every matchup.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Target,
    title: "Line Movement",
    description: "Track opening lines against current market rates to identify where the professional money is shifting.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Sharp Money",
    description: "Detect discrepancies between public betting percentages and total handle to find the professional edge.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Brain,
    title: "Injury Impact",
    description: "Deep-layer analysis of depth chart changes beyond the starters, calculating true rotational value lost.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Activity,
    title: "Situational Spots",
    description: "Automatic identification of look-ahead, let-down, and revenge scenarios based on historical performance.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Star,
    title: "Odds Value",
    description: "Constant monitoring of 12+ sportsbooks to find the absolute best price for every suggested position.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
];

const stats = [
  { value: "46", label: "Analysis Factors", icon: Target },
  { value: "14+", label: "Sports & Leagues", icon: Activity },
  { value: "1M+", label: "Simulations Daily", icon: Brain },
  { value: "99.9%", label: "Uptime", icon: Zap },
];

const testimonials = [
  {
    quote: "The depth of the data is unlike anything I've seen. The engine caught line value three hours before the public moved the market.",
    author: "Marcus T.",
    tier: "Sharp Member",
    since: "Jan 2025"
  },
  {
    quote: "Joining Edge was the best decision for my bankroll. The assistant helps me filter out noise and focus on high-confidence plays.",
    author: "Jordan D.",
    tier: "Edge Member",
    since: "Feb 2025"
  },
  {
    quote: "This isn't just a picker service — it's a full intelligence suite. The arbitrage scanner alone paid for my membership in week one.",
    author: "Ryan S.",
    tier: "Max Member",
    since: "Dec 2024"
  },
  {
    quote: "Verified tracking is why I stay. Understanding the reasoning behind every prediction gives me confidence to stick to the strategy.",
    author: "Sarah K.",
    tier: "Sharp Member",
    since: "Mar 2025"
  }
];

const trustSignals = [
  { icon: Lock, label: "SSL Secured", description: "Military-grade encryption" },
  { icon: Database, label: "4 Live Data Sources", description: "Sub-second updates" },
  { icon: CheckCircle, label: "3,800+ Picks Tracked", description: "Verified performance" },
  { icon: Shield, label: "Members-Only Access", description: "Limited entry protocol" },
];

const howItWorks = [
  { step: 1, title: "Apply", description: "Submit your application for our Edge or Max tiers to join our exclusive community." },
  { step: 2, title: "Get Approved", description: "Our team reviews all applicants to maintain a high-signal environment." },
  { step: 3, title: "Access Your Edge", description: "Unlock the full suite of intelligence tools and start betting smarter." },
];

const intelligenceSteps = [
  {
    number: "01",
    icon: Database,
    title: "Live Data Harvest",
    subtitle: "Every 60 seconds",
    description: "Four simultaneous data feeds — live scores, odds & lines, injury reports, and weather — ingested and cross-validated before anything is analyzed.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    number: "02",
    icon: Brain,
    title: "46-Factor Analysis",
    subtitle: "Proprietary model",
    description: "Every matchup is scored across 46 weighted intelligence factors: rest advantage, travel impact, sharp money %, line steam, injury depth, venue history, and 39 more.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    number: "03",
    icon: Zap,
    title: "Sors Simulation Engine",
    subtitle: "1M+ daily simulations",
    description: "Our proprietary simulation engine models every possible game outcome across millions of scenarios to compute true win probability and optimal Kelly stake sizing.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    number: "04",
    icon: Target,
    title: "Grade & Edge Assignment",
    subtitle: "A+ to F quality control",
    description: "Each pick receives an A+ to F grade based on confidence, EV calculation, and model agreement. Only A and B-grade picks with confirmed positive expected value reach members.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    number: "05",
    icon: Activity,
    title: "Real-Time Delivery",
    subtitle: "Instant push to members",
    description: "Approved picks push instantly to your dashboard via our live intelligence feed. Lines are continuously monitored for steam moves and late-breaking injury news.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
];

const pricingTiers = [
  {
    name: "Sharp",
    price: 49,
    description: "Members Only",
    features: ["Unlimited ticket generations", "14+ sports & leagues", "Full 46-factor engine", "+EV finder"],
    cta: "Join Sharp",
    variant: "secondary" as const,
  },
  {
    name: "Edge",
    price: 99,
    description: "By Application",
    features: ["Full Edge tool access", "AI Betting Assistant", "ML prop projections", "Arbitrage scanner"],
    cta: "Join Edge",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Max",
    price: 249,
    description: "Zero Limits. Maximum Depth.",
    features: ["Zero limits — priority processing", "Custom model builder", "Hedge & arbitrage tools", "Early access"],
    cta: "Join Max",
    variant: "secondary" as const,
  },
];

interface FoundersStatus {
  isActive: boolean;
  launchedAt: string | null;
  memberSpotsTotal: number;
  memberSpotsClaimed: number;
  memberSpotsRemaining: number;
  enterpriseSpotsTotal: number;
  enterpriseSpotsClaimed: number;
  enterpriseSpotsRemaining: number;
}

export default function LandingPage() {
  useSEO({ title: "Sors Maxima — Private Betting Intelligence", description: "Exclusive sports betting intelligence platform. 46 analysis factors, real-time data, advanced simulations. Members only." });

  const { data: trackStats } = useQuery<{ settledPicks: number }>({
    queryKey: ["/api/track-record"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: foundersStatus } = useQuery<FoundersStatus>({
    queryKey: ["/api/founders/status"],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const picksTrackedLabel = trackStats?.settledPicks
    ? `${trackStats.settledPicks.toLocaleString()}+ Picks Tracked`
    : "3,800+ Picks Tracked";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation Bar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md" data-testid="nav-landing">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-sm text-foreground tracking-tight">Sors Maxima</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs hidden sm:flex" data-testid="nav-link-pricing">
                Pricing
              </Button>
            </Link>
            <Link href="/track-record">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs hidden sm:flex" data-testid="nav-link-track-record">
                Track Record
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs font-medium" data-testid="nav-button-member-login">
                Member Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <GoldenTicketHero />

      <section className="border-y bg-muted/30" data-testid="section-trust-signals">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {trustSignals.map((signal) => {
              const displayLabel = signal.label.includes("Picks Tracked") ? picksTrackedLabel : signal.label;
              return (
                <div key={signal.label} className="flex items-center gap-3 justify-center lg:justify-start" data-testid={`trust-signal-${signal.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <signal.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold leading-none">{displayLabel}</div>
                    <div className="text-xs text-muted-foreground">{signal.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-features">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What Our Engine Analyzes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our 46-factor analysis engine processes millions of data points daily to find edges that others miss.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className={`w-10 h-10 rounded-md ${feature.bg} flex items-center justify-center shrink-0`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The Intelligence Behind Every Pick */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-intelligence-pipeline">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="outline" className="gap-1.5 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <Zap className="w-3 h-3" /> Fully Automated Intelligence
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            The Intelligence Behind Every Pick
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every pick on Sors Maxima passes through a 5-stage automated pipeline before it ever reaches a member. 
            Nothing reaches you unless it clears every gate.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute left-[calc(50%-1px)] top-8 bottom-8 w-0.5 bg-gradient-to-b from-border/0 via-border to-border/0" />
          <div className="space-y-6 lg:space-y-0">
            {intelligenceSteps.map((step, i) => (
              <div
                key={step.number}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center lg:mb-16 ${i % 2 !== 0 ? "lg:rtl" : ""}`}
                data-testid={`intelligence-step-${step.number}`}
              >
                <div className={`${i % 2 !== 0 ? "lg:ltr lg:text-right" : ""} mb-4 lg:mb-0`}>
                  <div className={`inline-flex items-center gap-3 mb-3 ${i % 2 !== 0 ? "lg:flex-row-reverse" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center shrink-0`}>
                      <step.icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${step.color} opacity-70`}>Step {step.number}</span>
                      <span className="text-[10px] text-muted-foreground mx-2">·</span>
                      <span className="text-[10px] text-muted-foreground">{step.subtitle}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{step.description}</p>
                </div>
                <div className={`hidden lg:flex items-center ${i % 2 !== 0 ? "lg:justify-end" : "lg:justify-start"}`}>
                  <div className={`w-20 h-20 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center shadow-lg`}>
                    <span className={`text-4xl font-black ${step.color} opacity-30`}>{step.number}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Every factor. Every simulation. Every grade. Running automatically so the edge is always fresh.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2" data-testid="button-intel-cta">
              Access the Intelligence
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-muted/50 border-y" data-testid="section-how-it-works">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join our exclusive community in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
            {howItWorks.map((step) => ( step.step === 2 ? (
              <div key={step.step} className="relative z-10 flex flex-col items-center text-center space-y-4" data-testid={`step-${step.step}`}>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">{step.description}</p>
              </div>
            ) : (
              <div key={step.step} className="relative z-10 flex flex-col items-center text-center space-y-4" data-testid={`step-${step.step}`}>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">{step.description}</p>
              </div>
            )))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-testimonials">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Trusted by the Sharpest
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join a community of data-driven bettors who demand more than just luck.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="flex flex-col" data-testid={`testimonial-card-${i}`}>
              <CardContent className="pt-6 flex-1 italic text-sm text-muted-foreground">
                "{testimonial.quote}"
              </CardContent>
              <CardFooter className="border-t pt-4 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px]">{testimonial.author}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-bold">{testimonial.author}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {testimonial.tier} since {testimonial.since}
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 border-y" data-testid="section-pricing">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Membership Tiers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the level of intelligence that matches your strategy.
            </p>
            {foundersStatus?.isActive && foundersStatus.memberSpotsRemaining > 0 && (
              <div className="max-w-sm mx-auto space-y-2 pt-2" data-testid="founders-scarcity-counter">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  Founding 500 — Active Now
                  {foundersStatus.memberSpotsRemaining <= 100 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <Flame className="w-3 h-3" />
                      Almost Full
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">{foundersStatus.memberSpotsClaimed} claimed</span>
                  <span className={`font-bold ${foundersStatus.memberSpotsRemaining <= 50 ? "text-red-400" : foundersStatus.memberSpotsRemaining <= 150 ? "text-amber-400" : "text-primary"}`}>
                    {foundersStatus.memberSpotsRemaining} of {foundersStatus.memberSpotsTotal} member spots left
                  </span>
                </div>
                <Progress value={Math.round((foundersStatus.memberSpotsClaimed / foundersStatus.memberSpotsTotal) * 100)} className="h-1.5" />
                <div className="flex items-center justify-between text-[10px] px-1 text-muted-foreground">
                  <span>
                    Join now to lock your price forever.{" "}
                    <Link href="/founders" className="text-amber-400 underline underline-offset-2 hover:text-amber-300" data-testid="link-founders-wall">
                      See the Founders Wall →
                    </Link>
                  </span>
                  <span className="shrink-0 ml-2 text-amber-400/70">
                    {foundersStatus.enterpriseSpotsRemaining} of {foundersStatus.enterpriseSpotsTotal} Enterprise spots open
                  </span>
                </div>
              </div>
            )}
            {foundersStatus?.isActive && foundersStatus.memberSpotsRemaining === 0 && (
              <div className="max-w-sm mx-auto pt-2" data-testid="founders-closed-banner">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3 text-center space-y-1">
                  <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5" />
                    Founding 500 — Closed
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All 500 member spots have been claimed.{" "}
                    <Link href="/founders" className="text-amber-400 underline underline-offset-2 hover:text-amber-300" data-testid="link-founders-wall-closed">
                      View the Founders Wall →
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${tier.popular ? "border-primary shadow-lg shadow-primary/10" : ""}`}
                data-testid={`card-pricing-${tier.name.toLowerCase()}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={`/register?plan=${tier.name.toLowerCase()}`} className="w-full">
                    <Button
                      className="w-full"
                      variant={tier.variant}
                      data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="ghost" className="gap-1" data-testid="link-full-pricing">
                View full pricing details
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden" data-testid="section-footer-cta">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to Gain the Edge?
          </h2>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Apply for membership today and join the inner circle of data-driven betting.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/register">
              <Button size="lg" data-testid="button-footer-join-now">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="backdrop-blur-sm bg-white/5"
                data-testid="button-footer-see-pricing"
              >
                View Plans
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-400" data-testid="text-footer-member-login">
            Already a member?{" "}
            <Link href="/login" className="text-primary underline underline-offset-2 hover:text-primary/80" data-testid="link-footer-login">
              Log in here
            </Link>
          </p>
          <p className="text-xs text-gray-400 max-w-md mx-auto pt-4" data-testid="text-landing-disclaimer">
            For entertainment and educational purposes only. This is an analysis tool, not a sportsbook. Not gambling advice.
            No guarantees of accuracy or profitability. Must be 21+. We may earn referral fees from partner sportsbooks.
            {" "}<a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="underline">Problem Gambling Help: 1-800-522-4700</a>
          </p>
        </div>
      </section>
    </div>
  );
}
