import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Crown, Gem, Atom, Star, Trophy, Shield, Bot, LineChart, Bell, Users, Wallet, Target, AlertTriangle, Sparkles, Lock, Flame, Eye, Swords } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
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
    tagline: 'The Starting Line',
    description: 'Full engine access. Smarter parlays. Real analysis that recreational bettors never see.',
    monthlyPrice: 49,
    yearlyPrice: 468,
    monthlyPriceId: 'price_1SskcQIp7f8yVoSO8uj04w8T',
    yearlyPriceId: 'price_1SskcQIp7f8yVoSO1VDHyrWy',
    features: [
      '25 ticket generations per day',
      'Unlimited daily usage',
      'All 6 US sports + 8 international soccer leagues',
      'Full 46-factor Prediction Engine',
      'Visual drag-and-drop ticket builder',
      'Bet grading (A-F) on every ticket',
      'Power Score on every leg',
      '+EV finder across all markets',
      'ROI dashboard & performance tracker',
      'Paper trading mode',
      'Community leaderboard access',
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/10',
  },
  {
    id: 'elite',
    name: 'Edge',
    tagline: 'Where Sharps Play',
    description: 'AI assistant, live alerts, prop projections, and the tools that separate winners from everyone else.',
    monthlyPrice: 99,
    yearlyPrice: 948,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOEKOx5hde',
    yearlyPriceId: 'price_1SskcRIp7f8yVoSOOBNZTk3V',
    features: [
      'Everything in Sharp, plus:',
      'Unlimited ticket generations',
      'Unlimited daily usage',
      'AI Betting Assistant (unlimited chats)',
      'Player prop projections (ML-powered)',
      'Real-time line movement alerts',
      'Live momentum tracker',
      'Same-game parlay (SGP) optimizer',
      'Arbitrage opportunity scanner',
      'Optimal Kelly Criterion stake sizing',
      'Correlation engine for parlays',
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
    description: 'Zero limits. Maximum depth. The full arsenal — built for high-volume bettors who demand every edge.',
    monthlyPrice: 249,
    yearlyPrice: 2388,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOWQe60fFw',
    yearlyPriceId: 'price_1SskcSIp7f8yVoSOxK0pY4Ki',
    features: [
      'Everything in Edge, plus:',
      'Zero limits — priority processing on all analyses',
      'Deep-scan analysis (2x simulation depth)',
      'Custom model builder (adjust all 46 weights)',
      'Hedge calculator & optimizer',
      'Bankroll simulator with Monte Carlo projections',
      'Export bet slips to 6 sportsbooks',
      'Pattern recognition engine (pre-game & live)',
      'Closing line value tracking',
      'Priority processing on all analyses',
      'Early access to new features & beta tools',
      'Automated tax export reports',
      'Direct support channel',
    ],
    icon: <Gem className="w-6 h-6" />,
    color: 'from-amber-400 via-yellow-500 to-orange-500',
    borderColor: 'border-amber-500/40',
    glowColor: 'shadow-amber-500/20',
  },
];

export default function Pricing() {
  useSEO({ title: "Pricing", description: "Choose the plan that fits your betting strategy" });
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();

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
    
    const priceId = isYearly ? tier.yearlyPriceId : tier.monthlyPriceId;
    checkoutMutation.mutate(priceId);
  };

  const currentTier = subscription?.tier || 'none';

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 space-y-12">
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

        <header className="text-center space-y-5">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-purple-500/10 border-purple-500/30 text-purple-400 px-3 py-1">
              <Lock className="w-3 h-3" />
              Members Only
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400 px-3 py-1">
              <Atom className="w-3 h-3" />
              46 Analysis Factors
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" data-testid="text-pricing-headline">
            Built for Bettors Who Refuse to Lose Blind
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sors Maxima isn't for everyone. If you're still guessing, this isn't for you.
            If you want the math, the models, and the edge — pick your tier.
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
                <CardDescription className="min-h-[3rem] text-sm">{tier.description}</CardDescription>
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
                
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
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
                  {currentTier === tier.id ? 'Current Plan' : `Get ${tier.name} Access`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="card-tier-access">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Access Level
              </CardTitle>
              <CardDescription>Unlimited usage within your tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium" data-testid="text-tier-access">
                  {currentTier === 'none' ? 'No active plan' : `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} member`}
                </span>
                <Badge variant="secondary" data-testid="text-current-tier">
                  {currentTier === 'none' ? 'Free' : currentTier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Every tier includes unlimited daily usage of all features in your plan. No credit limits, no caps — just results.
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
                Every prediction runs through a 46-factor model built on real-time data, not gut feeling. If the engine doesn't sharpen your approach, cancel anytime — no contracts, no hassle.
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-xl p-8 border">
          <h2 className="text-2xl font-bold mb-2 text-center">Why Sors Maxima?</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            This isn't a tip sheet. It's the most advanced betting intelligence engine available to retail bettors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bot className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold">AI-Powered Analysis</h3>
              <p className="text-sm text-muted-foreground">
                46 factors analyzed instantly. Results in seconds, not hours.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Target className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-semibold">+EV Detection</h3>
              <p className="text-sm text-muted-foreground">
                Scans every market for positive expected value so you only bet when the math is in your favor.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <Eye className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-semibold">Sharp Money Tracking</h3>
              <p className="text-sm text-muted-foreground">
                See where professional bettors are putting their money — and follow the smart side.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="font-semibold">Bankroll Protection</h3>
              <p className="text-sm text-muted-foreground">
                Kelly sizing, correlation guards, and risk warnings keep your bets smart and your bankroll intact.
              </p>
            </div>
          </div>
        </div>

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
