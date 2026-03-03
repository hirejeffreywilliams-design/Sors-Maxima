import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Zap,
  Brain,
  Activity,
  Wrench,
  Users,
  Shield,
  TrendingUp,
  Target,
  DollarSign,
  Calculator,
  BarChart3,
  ChevronRight,
  Star,
  Check,
  Atom,
  Lock,
  Database,
  CheckCircle,
} from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";
import { useSEO } from "@/hooks/use-seo";

const features = [
  {
    icon: Atom,
    title: "Sors Prediction Engine",
    description: "46 contributing factors across 7 categories with synergy detection and adaptive learning for every prediction.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Brain,
    title: "Advanced Simulations",
    description: "Run millions of simulations per analysis to calculate true win probabilities and expected value on every bet.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Activity,
    title: "Live ESPN Data",
    description: "Real-time scores, rosters, injuries, and line movement from ESPN across 14+ sports and leagues.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Wrench,
    title: "Pro Tools Suite",
    description: "Correlation engine, arbitrage finder, same-game parlay optimizer, custom model builder, and bet slip exports.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Community & Tipsters",
    description: "Follow top performers, copy bets, join competitions, and share picks with verified tipster communities.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Shield,
    title: "Responsible Gaming",
    description: "Built-in bankroll management, session limits, cool-off periods, loss alerts, and self-exclusion tools.",
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
    quote: "The depth of the data is unlike anything I've seen. The Sors Engine caught line value 3 hours before the public moved the market.",
    author: "M.T.",
    tier: "Sharp Member",
    since: "Jan 2025"
  },
  {
    quote: "Applying for Edge was the best decision for my bankroll. The AI assistant helps me filter out the noise and focus on high-confidence plays.",
    author: "J.D.",
    tier: "Edge Member",
    since: "Feb 2025"
  },
  {
    quote: "Sors Maxima isn't just a picker service; it's a full intelligence suite. The arbitrage scanner alone paid for my membership in week one.",
    author: "R.S.",
    tier: "Max Member",
    since: "Dec 2024"
  },
  {
    quote: "Verified tracking is why I'm here. Knowing the 'why' behind every 46-factor prediction gives me the confidence to stick to the strategy.",
    author: "S.K.",
    tier: "Sharp Member",
    since: "Mar 2025"
  }
];

const trustSignals = [
  { icon: Lock, label: "SSL Secured", description: "Military-grade encryption" },
  { icon: Database, label: "6 Live Data APIs", description: "Sub-second updates" },
  { icon: CheckCircle, label: "3,800+ Picks Tracked", description: "Verified performance" },
  { icon: Shield, label: "Members-Only Access", description: "Limited entry protocol" },
];

const howItWorks = [
  { step: 1, title: "Apply", description: "Submit your application for our Edge or Max tiers to join our exclusive community." },
  { step: 2, title: "Get Approved", description: "Our team reviews all applicants to maintain a high-signal environment." },
  { step: 3, title: "Access Your Edge", description: "Unlock the full suite of intelligence tools and start betting smarter." },
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

export default function LandingPage() {
  useSEO({ title: "Sors Maxima — Private Betting Intelligence", description: "Exclusive sports betting intelligence platform. 46 analysis factors, real-time data, advanced simulations. Members only." });

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

      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="flex flex-col items-center text-center space-y-8">
            <img
              src={sorsMaximaLogo}
              alt="Sors Maxima"
              className="w-20 h-20 rounded-2xl"
              data-testid="img-logo"
            />
            <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-300 backdrop-blur-sm">
              <Atom className="w-3 h-3" />
              Private Betting Intelligence Platform
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl leading-tight">
              Exclusive Intelligence for the Modern Bettor.
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
              Sors Maxima is a closed-door platform providing institutional-grade data and proprietary simulations. 
              We don't just find picks; we identify market inefficiencies.
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/apply">
                <Button size="lg" data-testid="button-hero-join-now">
                  Request Access
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="backdrop-blur-sm bg-white/5"
                  data-testid="button-hero-see-pricing"
                >
                  View Tiers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30" data-testid="section-trust-signals">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {trustSignals.map((signal) => (
              <div key={signal.label} className="flex items-center gap-3 justify-center lg:justify-start" data-testid={`trust-signal-${signal.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <signal.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold leading-none">{signal.label}</div>
                  <div className="text-xs text-muted-foreground">{signal.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-features">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What Our Engine Tracks
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
            <Link href="/apply">
              <Button size="lg" className="gap-2">
                Start Your Application
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
                  <Link href={tier.name === "Sharp" ? "/pricing" : `/apply?tier=${tier.name.toLowerCase()}`} className="w-full">
                    <Button
                      className="w-full"
                      variant={tier.variant}
                      data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                    >
                      {tier.name === "Sharp" ? "Join Sharp" : `Apply for ${tier.name}`}
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
            <Link href="/apply">
              <Button size="lg" data-testid="button-footer-join-now">
                Start Application
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
