import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Crown, Gem, Star, Trophy, Shield, Bot, Bell, Users, Wallet, Target, AlertTriangle, Sparkles, Lock, Flame, TrendingUp, BarChart2, Globe, Zap, Brain, ChevronRight, Swords } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSEO } from "@/hooks/use-seo";

interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
  borderColor: string;
  glowColor: string;
}

const tiers: PricingTier[] = [
  {
    id: 'pro',
    name: 'Sharp',
    tagline: 'Members Only',
    description: 'Full engine access, daily ready-made tickets, and every tool recreational bettors never see. This is where serious betting begins.',
    monthlyPrice: 49,
    yearlyPrice: 468,
    monthlyPriceId: 'price_1T6Z8MCsa9MEIxma1AtmvcQa',
    yearlyPriceId: 'price_1T6Z8MCsa9MEIxmajGN5GBnE',
    features: [
      "Today's Best Tickets — pre-built daily parlays",
      '46-Factor Prediction Engine across 6 US sports',
      'A–F bet grade on every pick and ticket',
      'Visual drag-and-drop parlay builder',
      '+EV finder scanning every betting market',
      '8 international soccer leagues (draws & underdogs)',
      'Player props analyzer — ML-powered projections',
      'Closing Line Value (CLV) tracker',
      'ROI dashboard & performance analytics',
      'Full track record — every settled pick with win rate, CLV, and calibration data',
      'Community leaderboards & social feed',
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/10',
  },
  {
    id: 'elite',
    name: 'Edge',
    tagline: 'By Application',
    description: 'Real-time alerts, sharp money signals, advanced Kelly sizing, and the Daily Edge Parlay — the full arsenal that separates winners from everyone else.',
    monthlyPrice: 99,
    yearlyPrice: 948,
    monthlyPriceId: 'price_1T6Z8NCsa9MEIxmaEjp1NamA',
    yearlyPriceId: 'price_1T6Z8NCsa9MEIxma6NAdgBQB',
    features: [
      'Everything in Sharp, plus:',
      'Daily Edge Parlay — cross-sport high-value underdog parlay',
      'Real-time line movement push alerts',
      'Live odds comparison across 6 sportsbooks',
      'Arbitrage scanner + positive EV alerts',
      'Kelly Criterion stake sizing engine',
      'Same-game parlay (SGP) correlation engine',
      'Market timing signals — bet now vs. wait',
      'Sharp money tracking & public consensus data',
      'Strategy Advisor with custom betting profiles',
      'Multi-book bankroll tracker',
    ],
    icon: <Crown className="w-6 h-6" />,
    popular: true,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/50',
    glowColor: 'shadow-purple-500/20',
  },
  {
    id: 'whale',
    name: 'Max',
    tagline: 'Invite Only',
    description: 'Zero restrictions. First-in-line on every pick. Monte Carlo simulations, custom model weights, and tools built for high-volume serious bettors.',
    monthlyPrice: 249,
    yearlyPrice: 2388,
    monthlyPriceId: 'price_1T6Z8OCsa9MEIxmapbFeapNC',
    yearlyPriceId: 'price_1T6Z8OCsa9MEIxmamlNBUxM0',
    features: [
      'Everything in Edge, plus:',
      'Whale picks released 30 min before all others',
      'Monte Carlo engine — up to 100K sims per matchup',
      'Custom 46-factor model weight editor',
      'Hedge calculator & multi-leg optimizer',
      'Pattern recognition engine (pre-game & live)',
      'CLV deep analysis — confidence tier calibration',
      'Export bet slips to DraftKings, FanDuel, BetMGM & more',
      'Automated tax export reports',
      'Priority queue on all analyses',
      'Direct support — response under 4 hours',
    ],
    icon: <Gem className="w-6 h-6" />,
    color: 'from-amber-400 via-yellow-500 to-orange-500',
    borderColor: 'border-amber-500/40',
    glowColor: 'shadow-amber-500/20',
  },
];

const competitorData = [
  { name: "The Action Network", price: "$8–20/mo", type: "News & tips", weaknesses: "No ML predictions, no parlay builder, human-driven picks" },
  { name: "OddsJam", price: "$49+/mo", type: "Odds & EV finder", weaknesses: "Odds comparison only — no game analysis, no picks engine" },
  { name: "Unabated", price: "$18/mo", type: "Sharp tools", weaknesses: "CLV focused, no predictions, no builder, no international" },
  { name: "TeamRankings", price: "$7–15/mo", type: "Power ratings", weaknesses: "Static rankings, no odds, no live data, no parlay tools" },
  { name: "SportsLine (CBS)", price: "$10–80/mo", type: "Expert picks", weaknesses: "Human pickers, not AI — no builder, no CLV, no live alerts" },
];

export default function Pricing() {
  useSEO({ title: "Pricing", description: "Choose the plan that fits your betting strategy" });
  const [isYearly, setIsYearly] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      toast({
        title: "Payment Successful",
        description: "Your subscription is now active. Welcome to Sors Maxima.",
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('cancelled') === 'true') {
      toast({
        title: "Checkout Cancelled",
        description: "No charge was made. You can subscribe anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: subscription } = useQuery<{ tier: string; status: string; customerId: string | null }>({
    queryKey: ['/api/subscription'],
  });

  const { data: stripeConfig } = useQuery<{ publishableKey: string | null; demoMode: boolean; message?: string }>({
    queryKey: ['/api/stripe/publishable-key'],
  });

  const isDemoMode = stripeConfig?.demoMode ?? false;

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/stripe/checkout', { priceId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (tier: PricingTier) => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Payment processing is disabled in demo mode. All features are available for testing.",
      });
      return;
    }

    const isGuest = !subscription || (subscription.tier === 'none' && subscription.status === 'none');
    if (isGuest) {
      window.location.href = `/register?plan=${tier.id}`;
      return;
    }

    const priceId = isYearly ? tier.yearlyPriceId : tier.monthlyPriceId;
    checkoutMutation.mutate(priceId);
  };

  const currentTier = subscription?.tier || 'none';

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {isDemoMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center" data-testid="banner-demo-mode">
            <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Beta Preview</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Payment processing is in demo mode. All features are unlocked for preview.
            </p>
          </div>
        )}

        {/* Header */}
        <header className="text-center space-y-5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5 bg-purple-500/10 border-purple-500/30 text-purple-400 px-3 py-1">
              <Lock className="w-3 h-3" />
              Members Only
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-blue-500/10 border-blue-500/30 text-blue-400 px-3 py-1">
              <Brain className="w-3 h-3" />
              46-Factor AI Engine
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-green-500/10 border-green-500/30 text-green-400 px-3 py-1">
              <BarChart2 className="w-3 h-3" />
              Full Verified Track Record
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" data-testid="text-pricing-headline">
            Access Is Limited. The Edge Is Not.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sors Maxima is a closed intelligence platform. We don't sell tips — we sell the math, the models, and the edge the books don't want you to have.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
            </Label>
          </div>
        </header>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative flex flex-col transition-all duration-300 hover:scale-[1.02] ${tier.popular ? `${tier.borderColor} shadow-lg ${tier.glowColor}` : tier.borderColor}`}
              data-testid={`card-tier-${tier.id}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md px-4">
                    <Trophy className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {tier.id === 'whale' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md px-4">
                    <Flame className="w-3 h-3 mr-1" />
                    Maximum Edge
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4 pt-8">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {tier.icon}
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{tier.tagline}</p>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="min-h-[3.5rem] text-sm">{tier.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold tracking-tight">
                      ${isYearly ? Math.round(tier.yearlyPrice / 12) : tier.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${tier.yearlyPrice}/year — billed annually
                    </p>
                  )}
                  {!isYearly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      or ${Math.round(tier.yearlyPrice / 12)}/mo billed yearly
                    </p>
                  )}
                </div>
                
                <ul className="space-y-2.5">
                  {tier.features.map((feature, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-sm ${i === 0 && feature.includes('Everything') ? 'font-semibold text-foreground' : ''}`}>
                      {i === 0 && feature.includes('Everything') ? (
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="pt-4">
                <Button 
                  className={`w-full h-12 text-base font-semibold ${tier.popular ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg' : tier.id === 'whale' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg' : ''}`}
                  variant={tier.popular || tier.id === 'whale' ? "default" : "secondary"}
                  disabled={currentTier === tier.id || checkoutMutation.isPending}
                  onClick={() => handleSubscribe(tier)}
                  data-testid={`button-subscribe-${tier.id}`}
                >
                  {currentTier === tier.id ? 'Current Membership' : `Join ${tier.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Why Sors Maxima */}
        <div className="bg-card rounded-xl p-8 border">
          <h2 className="text-2xl font-bold mb-2 text-center">Why Sors Maxima?</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            This isn't a tip sheet or a tout service. It's a private intelligence platform built for bettors who treat this like a business.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: <Brain className="w-7 h-7 text-blue-500" />, color: "bg-blue-500/10", title: "46-Factor AI Engine", desc: "Every pick analyzed across 46 real-data factors — not gut feeling. Results in seconds." },
              { icon: <TrendingUp className="w-7 h-7 text-green-500" />, color: "bg-green-500/10", title: "+EV Detection", desc: "Scans every market for positive expected value so you only bet when the math is with you." },
              { icon: <Globe className="w-7 h-7 text-purple-500" />, color: "bg-purple-500/10", title: "International Markets", desc: "8 soccer leagues, draws, and underdog value — markets most US platforms ignore entirely." },
              { icon: <Wallet className="w-7 h-7 text-amber-500" />, color: "bg-amber-500/10", title: "Bankroll Protection", desc: "Kelly sizing, correlation guards, and risk warnings keep your bets smart and bankroll intact." },
              { icon: <Zap className="w-7 h-7 text-cyan-500" />, color: "bg-cyan-500/10", title: "Live Intelligence", desc: "Server-sent events push real-time updates for scores, odds shifts, and sharp money alerts." },
              { icon: <BarChart2 className="w-7 h-7 text-rose-500" />, color: "bg-rose-500/10", title: "Transparent Track Record", desc: "Every settled pick logged with full win rate, CLV stats, and calibration tiers — nothing hidden." },
              { icon: <Bot className="w-7 h-7 text-violet-500" />, color: "bg-violet-500/10", title: "Self-Learning Model", desc: "CLV-gated learning engine continuously retrains weights from settled picks — it gets smarter." },
              { icon: <Flame className="w-7 h-7 text-orange-500" />, color: "bg-orange-500/10", title: "Daily Edge Parlay", desc: "Daily cross-sport high-value underdog parlay built by the intelligence engine — Edge tier and above." },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-2.5">
                <div className={`w-14 h-14 mx-auto rounded-full ${item.color} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Competitive Comparison */}
        <div className="space-y-4">
          <button
            onClick={() => setShowCompetitors(!showCompetitors)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mx-auto"
            data-testid="button-show-competitors"
          >
            <Swords className="w-4 h-4" />
            How does Sors Maxima compare to other platforms?
            <ChevronRight className={`w-4 h-4 transition-transform ${showCompetitors ? 'rotate-90' : ''}`} />
          </button>

          {showCompetitors && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">Competitive Landscape</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Most platforms do one or two things. Sors Maxima does everything — and it learns.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Platform</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Focus</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">What They're Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorData.map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-6 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.price}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{c.weaknesses}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="px-6 py-3 font-bold text-primary">Sors Maxima</td>
                      <td className="px-4 py-3 font-semibold">$49–249/mo</td>
                      <td className="px-4 py-3 font-medium">Full intelligence platform</td>
                      <td className="px-4 py-3 text-xs text-green-600 dark:text-green-400 font-medium">All-in-one: AI picks + builder + odds + live + international + CLV + self-learning model</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="card-tier-access">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Membership
              </CardTitle>
              <CardDescription>Exclusive access within your tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium" data-testid="text-tier-access">
                  {currentTier === 'none' ? 'No active membership' : `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} member`}
                </span>
                <Badge variant="secondary" data-testid="text-current-tier">
                  {currentTier === 'none' ? 'Guest' : currentTier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Members get unrestricted access to every tool in their tier. No usage caps, no throttling — the full engine, all day.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-guarantee">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Our Promise
              </CardTitle>
              <CardDescription>We stand behind the engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Every prediction runs through a 46-factor model with real-time data and continuous learning from every settled pick — not gut feeling. Cancel anytime, no contracts, no hassle.
              </p>
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  Cancel anytime
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  No contracts
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  No lock-in
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="pt-6 border-t text-center space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-pricing-disclaimer">
            Sors Maxima is an analysis and educational tool only — we are not a sportsbook. All probabilities and predictions are estimates based on statistical models.
            No guaranteed wins. Please gamble responsibly. Must be 21+ in most jurisdictions.
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-pricing-affiliate">
            We may earn referral fees if you sign up with partner sportsbooks through our links. This does not affect pricing or analysis quality.
            {" "}<a href="/legal" className="underline">Full disclosure</a>
            {" | "}<a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="underline">Problem Gambling Help: 1-800-522-4700</a>
          </p>
        </div>

      </div>
    </div>
  );
}
