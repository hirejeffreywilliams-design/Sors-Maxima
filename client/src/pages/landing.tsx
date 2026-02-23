import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";

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

const pricingTiers = [
  {
    name: "Sharp",
    price: 49,
    description: "The Starting Line",
    features: ["25 ticket generations/day", "14+ sports & leagues", "Full 46-factor engine", "+EV finder"],
    cta: "Join Sharp",
    variant: "secondary" as const,
  },
  {
    name: "Edge",
    price: 99,
    description: "Where Sharps Play",
    features: ["Unlimited generations", "AI Betting Assistant", "ML prop projections", "Arbitrage scanner"],
    cta: "Join Edge",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Max",
    price: 249,
    description: "Zero Limits. Maximum Depth.",
    features: ["Unlimited AI credits", "Custom model builder", "Priority processing", "Early access"],
    cta: "Join Max",
    variant: "secondary" as const,
  },
];

export default function LandingPage() {
  const [betSize, setBetSize] = useState(50);
  const [betsPerWeek, setBetsPerWeek] = useState(10);
  const [winRate, setWinRate] = useState(48);

  const edgeImprovement = 6.5;
  const monthlyBets = betsPerWeek * 4.33;
  const currentProfit = monthlyBets * betSize * ((winRate / 100) * 1.91 - 1);
  const improvedWinRate = winRate + edgeImprovement;
  const improvedProfit = monthlyBets * betSize * ((improvedWinRate / 100) * 1.91 - 1);

  const maxBarValue = Math.max(Math.abs(currentProfit), Math.abs(improvedProfit), 1);

  return (
    <div className="min-h-screen bg-background">
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
              AI-Powered Betting Intelligence
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl leading-tight">
              Stop Guessing. Start Winning with Data.
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
              Harness 46 analysis factors, advanced simulations, and live ESPN data across 14+ sports and leagues
              to gain a competitive edge the sportsbooks fear.
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/login">
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
                  See Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-features">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything You Need to Bet Smarter
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A full suite of AI-driven tools designed to find edges, manage risk, and maximize returns.
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

      <section className="bg-muted/50 border-y" data-testid="section-stats">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <stat.icon className="w-6 h-6 mx-auto text-muted-foreground" />
                <div className="text-3xl sm:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24" data-testid="section-roi-calculator">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="outline" className="gap-1">
            <Calculator className="w-3 h-3" />
            ROI Calculator
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            See Your Potential Edge
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Input your betting habits and see how a {edgeImprovement}% win rate improvement changes your bottom line.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Average Bet Size
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={betSize}
                    onChange={(e) => setBetSize(Math.max(1, Math.min(1000, Number(e.target.value))))}
                    data-testid="input-bet-size"
                  />
                </div>
                <Slider
                  min={1}
                  max={500}
                  step={5}
                  value={[betSize]}
                  onValueChange={([v]) => setBetSize(v)}
                  data-testid="slider-bet-size"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Bets Per Week
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={betsPerWeek}
                  onChange={(e) => setBetsPerWeek(Math.max(1, Math.min(100, Number(e.target.value))))}
                  data-testid="input-bets-per-week"
                />
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[betsPerWeek]}
                  onValueChange={([v]) => setBetsPerWeek(v)}
                  data-testid="slider-bets-per-week"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Current Win Rate %
                </label>
                <Input
                  type="number"
                  min={30}
                  max={70}
                  value={winRate}
                  onChange={(e) => setWinRate(Math.max(30, Math.min(70, Number(e.target.value))))}
                  data-testid="input-win-rate"
                />
                <Slider
                  min={30}
                  max={70}
                  step={0.5}
                  value={[winRate]}
                  onValueChange={([v]) => setWinRate(v)}
                  data-testid="slider-win-rate"
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold text-center">Projected Monthly Results</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Without Sors Maxima ({winRate.toFixed(1)}% win rate)</span>
                    <span className={`font-semibold ${currentProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {currentProfit >= 0 ? "+" : ""}{currentProfit.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-6 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all ${currentProfit >= 0 ? "bg-green-500/40" : "bg-red-500/40"}`}
                      style={{ width: `${Math.max(2, (Math.abs(currentProfit) / maxBarValue) * 100)}%` }}
                      data-testid="bar-without-sors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      With Sors Maxima ({improvedWinRate.toFixed(1)}% win rate)
                    </span>
                    <span className={`font-semibold ${improvedProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {improvedProfit >= 0 ? "+" : ""}{improvedProfit.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-6 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all ${improvedProfit >= 0 ? "bg-green-500/70" : "bg-red-500/70"}`}
                      style={{ width: `${Math.max(2, (Math.abs(improvedProfit) / maxBarValue) * 100)}%` }}
                      data-testid="bar-with-sors"
                    />
                  </div>
                </div>

                {improvedProfit > currentProfit && (
                  <div className="text-center pt-2">
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +${(improvedProfit - currentProfit).toFixed(0)}/mo potential improvement
                    </Badge>
                  </div>
                )}
              </div>

              <div className="text-center pt-2">
                <Link href="/pricing">
                  <Button size="lg" data-testid="button-roi-view-plans">
                    View Membership Plans
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4 max-w-lg mx-auto">
          For illustrative purposes only. Assumes standard -110 odds. Actual results depend on bet selection, odds, and market conditions. Not a guarantee of profitability.
        </p>
      </section>

      <section className="bg-muted/50 border-y" data-testid="section-pricing">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three exclusive tiers built for serious bettors. No hidden fees. Cancel anytime.
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
                  <Link href={tier.price === 0 ? "/login" : "/pricing"} className="w-full">
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
            Ready to Bet Smarter?
          </h2>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Join thousands of bettors using Sors Maxima to turn data into an unfair advantage.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/pricing">
              <Button size="lg" data-testid="button-footer-join-now">
                Become a Member
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
                See Pricing
              </Button>
            </Link>
          </div>
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
