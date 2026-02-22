import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Gem, Atom, Star, Trophy, Shield, Bot, LineChart, Bell, Users, Wallet, Target, AlertTriangle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
}

const tiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Starter',
    description: 'Try the engine free and see what you\'ve been missing',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '',
    yearlyPriceId: '',
    features: [
      '3 ticket generations per day',
      '5 AI credits daily',
      '4 sports (NBA, NFL, MLB, NHL)',
      'Power Score on every bet',
      'Bet grading (A-F)',
      '1 free daily high-confidence pick',
      'Community leaderboard',
    ],
    icon: <Zap className="w-6 h-6" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    id: 'pro',
    name: 'Sharp',
    description: 'Unlock all sports, smarter parlays, and real analysis',
    monthlyPrice: 29,
    yearlyPrice: 290,
    monthlyPriceId: 'price_1SskcQIp7f8yVoSO8uj04w8T',
    yearlyPriceId: 'price_1SskcQIp7f8yVoSO1VDHyrWy',
    features: [
      'Unlimited ticket generations',
      '50 AI credits per day',
      'All 6 US sports + 8 international soccer leagues',
      'Full 46-factor Prediction Engine',
      'Visual drag-and-drop ticket builder',
      'Optimal stake sizing',
      'Correlation engine for parlays',
      '+EV finder across all markets',
      'ROI dashboard & performance tracker',
      'Paper trading mode',
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'elite',
    name: 'Edge',
    description: 'Pro tools, live alerts, and AI assistant for serious bettors',
    monthlyPrice: 59,
    yearlyPrice: 590,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOEKOx5hde',
    yearlyPriceId: 'price_1SskcRIp7f8yVoSOOBNZTk3V',
    features: [
      'Everything in Sharp, plus:',
      '200 AI credits per day',
      'AI Betting Assistant (unlimited chats)',
      'Player prop projections (ML-powered)',
      'Real-time line movement alerts',
      'Live momentum tracker',
      'Same-game parlay (SGP) optimizer',
      'Arbitrage opportunity scanner',
      'Multi-book bankroll tracker',
      'Automated tax export reports',
    ],
    icon: <Crown className="w-6 h-6" />,
    popular: true,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'whale',
    name: 'Max',
    description: 'Unlimited everything. Zero caps. Maximum edge.',
    monthlyPrice: 119,
    yearlyPrice: 1190,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOWQe60fFw',
    yearlyPriceId: 'price_1SskcSIp7f8yVoSOxK0pY4Ki',
    features: [
      'Everything in Edge, plus:',
      'Unlimited AI credits (no daily cap)',
      'Deep-scan analysis (2x simulation depth)',
      'Custom model builder (adjust all 46 weights)',
      'Hedge calculator & optimizer',
      'Bankroll simulator with projections',
      'Export bet slips to 6 sportsbooks',
      'Pattern recognition engine (pre-game & live)',
      'Closing line value tracking',
      'Priority processing on all analyses',
      'Early access to new features',
    ],
    icon: <Gem className="w-6 h-6" />,
    color: 'from-yellow-500 to-orange-500',
  },
];

export default function Pricing() {
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
    if (tier.id === 'free') return;
    
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

  const { data: credits } = useQuery<{ used: number; total: number; tier: string; resetsAt: string }>({
    queryKey: ['/api/credits'],
  });

  const currentTier = subscription?.tier || 'free';
  const creditsRemaining = credits ? credits.total - credits.used : 3;
  const creditsTotal = credits?.total || 5;
  const creditsUsedPercent = credits ? (credits.used / credits.total) * 100 : 40;

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {isDemoMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center" data-testid="banner-demo-mode">
            <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Beta Demo Mode</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Payment processing is currently disabled. All Pro features are available during beta testing with your 7-day trial.
            </p>
          </div>
        )}

        <header className="text-center space-y-4">
          <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
            <Atom className="w-3 h-3" />
            Powered by 46 Analysis Factors
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Stop Guessing. Start Winning.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every plan gives you AI-driven analysis, optimized parlays, and tools that work around the clock so you never miss an edge.
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
              <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
            </Label>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative flex flex-col ${tier.popular ? 'border-purple-500 shadow-lg shadow-purple-500/20' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white">
                    <Trophy className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white mb-3`}>
                  {tier.icon}
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ${isYearly ? Math.round(tier.yearlyPrice / 12) : tier.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {isYearly && tier.yearlyPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${tier.yearlyPrice}/year (billed annually)
                    </p>
                  )}
                </div>
                
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={tier.popular ? "default" : tier.id === 'free' ? "outline" : "secondary"}
                  disabled={currentTier === tier.id || checkoutMutation.isPending}
                  onClick={() => handleSubscribe(tier)}
                  data-testid={`button-subscribe-${tier.id}`}
                >
                  {currentTier === tier.id ? 'Current Plan' : 
                   tier.id === 'free' ? 'Start Free' : 
                   `Upgrade to ${tier.name} — 7-Day Free Trial`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card data-testid="card-credits-usage">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Credits Usage
            </CardTitle>
            <CardDescription>Track your daily AI credit consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium" data-testid="text-credits-remaining">
                {creditsRemaining} of {creditsTotal} remaining
              </span>
              <Badge variant="secondary" data-testid="text-credits-tier">
                {credits?.tier || currentTier} tier
              </Badge>
            </div>
            <Progress value={100 - creditsUsedPercent} className="h-2" data-testid="progress-credits" />
            <p className="text-sm text-muted-foreground">
              Credits reset daily at midnight UTC. Each credit = one AI-powered action (like generating a ticket or running an analysis).
            </p>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">What uses 1 credit:</p>
              <ul className="space-y-1">
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-3 w-3 shrink-0" /> Ticket generation
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-3 w-3 shrink-0" /> AI analysis
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-3 w-3 shrink-0" /> Prop projections
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card rounded-xl p-8 border">
          <h2 className="text-2xl font-bold mb-6 text-center">Built to Give You an Unfair Advantage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bot className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold">Fully Automated Analysis</h3>
              <p className="text-sm text-muted-foreground">
                46 factors crunched instantly by AI. No waiting, no middleman. You get results in seconds, not hours.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Target className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-semibold">Find +EV Bets Instantly</h3>
              <p className="text-sm text-muted-foreground">
                The engine scans every market for positive expected value so you only bet when the math is in your favor.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-semibold">Protect Your Bankroll</h3>
              <p className="text-sm text-muted-foreground">
                Smart stake sizing, risk warnings, and correlation checks keep your bets smart and your money safe.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t text-center space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-pricing-disclaimer">
            Sors Maxima is an analysis and educational tool only -- we are not a sportsbook. All probabilities and predictions are estimates based on statistical models.
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
