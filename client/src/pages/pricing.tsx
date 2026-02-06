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
    name: 'Free',
    description: 'Get started with basic quantum analysis',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '',
    yearlyPriceId: '',
    features: [
      '5 AI credits/day',
      '3 ticket generations per day',
      'Basic quantum coherence scores',
      '2 sports coverage (NBA, NFL)',
      'Standard bet grading (A to C)',
      'Community leaderboard view',
    ],
    icon: <Zap className="w-6 h-6" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full quantum analysis for serious bettors',
    monthlyPrice: 29,
    yearlyPrice: 290,
    monthlyPriceId: 'price_1SskcQIp7f8yVoSO8uj04w8T',
    yearlyPriceId: 'price_1SskcQIp7f8yVoSO1VDHyrWy',
    features: [
      '50 AI credits/day',
      'Unlimited ticket generations',
      'All 45 quantum analysis factors',
      'All 6 sports coverage',
      'Advanced bet grading (A+ to F)',
      'Kelly Criterion stake sizing',
      'Correlation engine access',
      'Basic smart alerts (5/day)',
      'Paper trading mode',
      'ROI dashboard & analytics',
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'Premium tools for professional edge',
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOEKOx5hde',
    yearlyPriceId: 'price_1SskcRIp7f8yVoSOOBNZTk3V',
    features: [
      '200 AI credits/day',
      'Everything in Pro',
      'Real-time steam move alerts',
      'AI Betting Assistant (unlimited)',
      'ML prop projections',
      'CLV tracking & analysis',
      'Public vs Sharp money data',
      'Live momentum tracker',
      'Unlimited smart alerts',
      'Advanced tax export by year',
      'Multi-sportsbook bankroll sync',
    ],
    icon: <Crown className="w-6 h-6" />,
    popular: true,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'whale',
    name: 'Whale',
    description: 'Maximum power for high-volume bettors',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOWQe60fFw',
    yearlyPriceId: 'price_1SskcSIp7f8yVoSOxK0pY4Ki',
    features: [
      'Unlimited AI credits',
      'Everything in Elite',
      'VIP quantum algorithm (deeper analysis)',
      'Extended historical data (5+ years)',
      'Advanced arbitrage detection',
      'Custom alert configurations',
      'Exclusive whale leaderboard',
      'Early access to beta features',
      'Priority API response times',
      'Unlimited bet backup storage',
      'Advanced hedge optimization',
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
            Quantum-Powered Intelligence
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Choose Your Edge
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock the full power of quantum analysis with our premium tiers. Join thousands of winning bettors.
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
                   tier.id === 'free' ? 'Get Started Free' : 
                   `Subscribe to ${tier.name}`}
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
              Credits reset daily at midnight UTC
            </p>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">What uses credits:</p>
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
          <h2 className="text-2xl font-bold mb-6 text-center">Why Bettors Choose Sors Maxima</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Atom className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold">Quantum Analysis</h3>
              <p className="text-sm text-muted-foreground">
                40+ factors analyzed using quantum-inspired algorithms for superior pattern recognition
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <LineChart className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-semibold">Proven Results</h3>
              <p className="text-sm text-muted-foreground">
                Our users average 12% higher CLV and 23% better ROI vs market benchmarks
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-semibold">Smart Bankroll</h3>
              <p className="text-sm text-muted-foreground">
                Kelly Criterion sizing and risk management to protect and grow your bankroll
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
